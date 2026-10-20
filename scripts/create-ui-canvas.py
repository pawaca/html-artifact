#!/usr/bin/env python3
"""Pack a UI scene and the pinned OpenPencil runtime into one offline HTML file."""
import argparse
import base64
import gzip
import hashlib
import html
from html.parser import HTMLParser
import io
import json
import math
import os
from pathlib import Path
import re
import sys
import tempfile

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets" / "ui-canvas"
VENDOR = ASSETS / "vendor"
COLOR = re.compile(r"#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?\Z")
NUMBERS = {
    "x": (-1e6, 1e6), "y": (-1e6, 1e6), "width": (0, 1e5), "height": (0, 1e5),
    "rotation": (-360, 360), "cornerRadius": (0, 1e5), "opacity": (0, 1),
    "fontSize": (1, 1000), "lineHeight": (1, 2000), "letterSpacing": (-100, 100),
    "layoutGrow": (0, 100),
}
ENUMS = {
    "type": {"FRAME", "GROUP", "RECTANGLE", "ELLIPSE", "TEXT", "LINE"},
    "fontFamily": {"Inter", "Noto Sans SC"},
    "fontWeight": {400, 500, 600, 700, 800},
    "textAlignHorizontal": {"LEFT", "CENTER", "RIGHT", "JUSTIFIED"},
    "textAlignVertical": {"TOP", "CENTER", "BOTTOM"},
    "textAutoResize": {"NONE", "HEIGHT", "WIDTH_AND_HEIGHT"},
    "layoutAlignSelf": {"AUTO", "STRETCH"},
    "layoutPositioning": {"AUTO", "ABSOLUTE"},
}
BOOLS = {"clipsContent", "visible"}
NODE_FIELDS = set(NUMBERS) | set(ENUMS) | BOOLS | {
    "name", "text", "fill", "stroke", "shadow", "layout", "children", "image",
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def number(value, low, high, path):
    require(type(value) in (int, float) and math.isfinite(value) and low <= value <= high,
            f"{path}: expected a finite number in [{low}, {high}]")


def fields(value, allowed, path):
    require(isinstance(value, dict), f"{path}: expected an object")
    require(not (set(value) - allowed), f"{path}: unknown fields {sorted(set(value) - allowed)}")


def validate(scene):
    fields(scene, {"version", "title", "description", "lang", "background", "artboards"}, "scene")
    require(type(scene.get("version")) is int and scene["version"] == 1, "scene.version must be 1")
    for key in ("title", "description", "lang"):
        require(isinstance(scene.get(key), str) and scene[key].strip(), f"scene.{key} must be a nonempty string")
    require(re.fullmatch(r"[a-zA-Z]{2,8}(?:-[a-zA-Z0-9]{1,8})*", scene["lang"]), "Invalid language tag")
    if "background" in scene:
        require(isinstance(scene["background"], str) and COLOR.fullmatch(scene["background"]), "Invalid background color")
    require(isinstance(scene.get("artboards"), list) and 1 <= len(scene["artboards"]) <= 100,
            "scene.artboards: expected 1–100 frames")
    count = 0
    texts = []

    def node(item, path, depth=0):
        nonlocal count
        count += 1
        require(count <= 10000 and depth <= 40, "Scene exceeds 10,000 nodes or 40 nesting levels")
        fields(item, NODE_FIELDS, path)
        require(item.get("type") in ENUMS["type"], f"{path}.type: unsupported node")
        require(isinstance(item.get("name"), str) and item["name"].strip(), f"{path}.name is required")
        texts.append(item["name"])
        for key in ("width", "height"):
            require(key in item, f"{path}.{key} is required")
        for key, value in item.items():
            where = f"{path}.{key}"
            if key in NUMBERS:
                number(value, *NUMBERS[key], where)
            elif key in ENUMS:
                require(isinstance(value, (str, int)) and value in ENUMS[key], f"{where}: unsupported value")
            elif key in BOOLS:
                require(type(value) is bool, f"{where}: expected boolean")
        if item["type"] == "TEXT":
            require(isinstance(item.get("text"), str), f"{path}.text is required")
            texts.append(item["text"])
        elif "text" in item:
            raise ValueError(f"{path}.text is only supported on TEXT nodes")
        if "fill" in item:
            require(isinstance(item["fill"], str) and COLOR.fullmatch(item["fill"]), f"{path}.fill: use #RRGGBB or #RRGGBBAA")
        if "stroke" in item:
            stroke = item["stroke"]
            fields(stroke, {"color", "width"}, f"{path}.stroke")
            require(isinstance(stroke.get("color"), str) and COLOR.fullmatch(stroke["color"]), f"{path}.stroke.color invalid")
            number(stroke.get("width"), 0, 1000, f"{path}.stroke.width")
        if "shadow" in item:
            shadow = item["shadow"]
            fields(shadow, {"color", "x", "y", "blur"}, f"{path}.shadow")
            require(isinstance(shadow.get("color"), str) and COLOR.fullmatch(shadow["color"]), f"{path}.shadow.color invalid")
            for key in ("x", "y", "blur"):
                number(shadow.get(key), 0 if key == "blur" else -1000, 1000, f"{path}.shadow.{key}")
        if "layout" in item:
            require(item["type"] == "FRAME", f"{path}: layout requires FRAME")
            layout = item["layout"]
            fields(layout, {"direction", "gap", "padding", "justify", "align", "hug"}, f"{path}.layout")
            require(layout.get("direction") in {"HORIZONTAL", "VERTICAL"}, f"{path}.layout.direction invalid")
            number(layout.get("gap", 0), 0, 10000, f"{path}.layout.gap")
            padding = layout.get("padding", 0)
            if not isinstance(padding, list):
                padding = [padding] * 4
            require(len(padding) == 4, f"{path}.layout.padding: use a number or [top,right,bottom,left]")
            for value in padding:
                number(value, 0, 10000, f"{path}.layout.padding")
            require(layout.get("justify", "MIN") in {"MIN", "CENTER", "MAX", "SPACE_BETWEEN"}, f"{path}.layout.justify invalid")
            require(layout.get("align", "MIN") in {"MIN", "CENTER", "MAX"}, f"{path}.layout.align invalid")
            require(type(layout.get("hug", False)) is bool, f"{path}.layout.hug: expected boolean")
        if "image" in item:
            image = item["image"]
            require(isinstance(image, str) and re.match(r"data:image/(png|jpeg|webp);base64,", image),
                    f"{path}.image: embed a PNG/JPEG/WebP data URL")
            payload = base64.b64decode(image.split(",", 1)[1], validate=True)
            require(0 < len(payload) <= 10 * 1024 * 1024, f"{path}.image exceeds 10 MiB")
        children = item.get("children", [])
        require(isinstance(children, list), f"{path}.children must be an array")
        require(not children or item["type"] in {"FRAME", "GROUP"}, f"{path}: only frames/groups contain children")
        for i, child in enumerate(children):
            node(child, f"{path}.children[{i}]", depth + 1)

    for i, item in enumerate(scene["artboards"]):
        node(item, f"artboards[{i}]")
        require(item["type"] == "FRAME" and item["width"] > 0 and item["height"] > 0, "Each artboard must be a nonempty FRAME")
    return count, "\n".join(texts)


def matching_fonts(manifest, text, force_cjk=False):
    remaining = {ord(c) for c in text if not c.isspace()} - set(manifest["latinCoverage"])
    selected = manifest["cjkFonts"] if remaining or force_cjk else []
    remaining -= set(manifest["cjkCoverage"])
    require(not remaining, "Bundled fonts do not cover: " + " ".join(f"U+{cp:04X} ({chr(cp)})" for cp in sorted(remaining)[:20]))
    return manifest["fonts"] + selected


def json_script(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).replace("&", "\\u0026").replace("<", "\\u003c").replace(">", "\\u003e").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")


def extract_scene(source):
    """Read our inert scene data, never execute a supplied HTML document."""
    class SceneParser(HTMLParser):
        def __init__(self):
            super().__init__(convert_charrefs=False)
            self.active = False
            self.scenes = []

        def handle_starttag(self, tag, attrs):
            if tag == "script" and dict(attrs).get("id") == "scene-data":
                require(dict(attrs).get("type") == "application/json", "scene-data must be JSON")
                self.active = True
                self.scenes.append("")

        def handle_data(self, data):
            if self.active:
                self.scenes[-1] += data

        def handle_endtag(self, tag):
            if tag == "script":
                self.active = False

    parser = SceneParser()
    parser.feed(source)
    require(len(parser.scenes) == 1, "Expected exactly one embedded scene-data JSON script")
    scene = json.loads(parser.scenes[0])
    validate(scene)
    return scene


def subset_font(data, text):
    try:
        from fontTools import subset
        from fontTools.ttLib import TTFont
        import brotli  # WOFF2 support is required for the bundled CJK faces.
    except ImportError as error:
        raise ValueError(
            "Font subsetting needs fontTools and Brotli. Install scripts/canvas-requirements.txt "
            "in a Python venv and run this script with that venv's Python. "
            "See references/ui-canvas.md. --full-fonts explicitly disables subsetting."
        ) from error
    options = subset.Options()
    options.layout_features = ["*"]  # Preserve shaping dependencies, including ligatures.
    options.name_IDs = ["*"]  # Keep attribution/license and family metadata.
    options.name_languages = ["*"]
    options.name_legacy = True
    # Include layer labels; ASCII covers renderer-generated sizes and numbers.
    characters = set(map(ord, text)) | set(range(32, 127)) | {0xA0, 0x2026, 0x2022, 0xFFFD}
    with TTFont(io.BytesIO(gzip.decompress(data)), recalcTimestamp=False) as font:
        wanted = characters & set(font.getBestCmap())
        worker = subset.Subsetter(options=options)
        worker.populate(unicodes=sorted(wanted))
        worker.subset(font)
        require(wanted <= set(font.getBestCmap()), "Font subsetting lost required characters")
        font.flavor = "woff2"
        output = io.BytesIO()
        font.save(output)
    # Start from original vendor fonts, never a previous artifact's subset.
    return gzip.compress(output.getvalue(), compresslevel=9, mtime=0)


def outline(items):
    return "<ul>" + "".join(
        "<li>" + html.escape(item["name"]) +
        (": " + html.escape(item["text"]) if item.get("text") else "") +
        (outline(item["children"]) if item.get("children") else "") + "</li>"
        for item in items) + "</ul>"


def generate(scene, check=False, full_fonts=False):
    count, text = validate(scene)
    manifest = json.loads((VENDOR / "manifest.json").read_text())
    require(hashlib.sha256((ASSETS / "runtime.js").read_bytes()).hexdigest() == manifest["runtimeSourceSha256"],
            "Runtime source changed. Maintainer: run npm ci && npm run build:canvas.")
    def uses_cjk(items):
        return any(item.get("fontFamily") == "Noto Sans SC" or uses_cjk(item.get("children", [])) for item in items)
    fonts = matching_fonts(manifest, text, uses_cjk(scene["artboards"]))

    def asset(path):
        data = (VENDOR / path).read_bytes()
        require(hashlib.sha256(data).hexdigest() == manifest["hashes"][path], f"Asset hash mismatch: {path}")
        return data

    encode = lambda data: base64.b64encode(data).decode("ascii")
    wasm = asset("canvaskit.wasm.gz")
    runtime = encode(asset("runtime.js.gz"))
    asset("LICENSES.txt")  # Verify the full notices before redistributing them.
    packed_fonts = []
    for font in fonts:
        data = asset(f"fonts/{font['file']}.gz")
        if not check and not full_fonts:
            data = subset_font(data, text)
        packed_fonts.append({**font, "data": encode(data)})
    if check:
        return None, count, len(fonts) - len(manifest["fonts"])
    payload = {"wasm": encode(wasm), "fonts": packed_fonts}
    zh = scene["lang"].startswith("zh")
    labels = {
        "LAYERS": ("Layers", "图层"), "MODE": ("UI design canvas", "UI 设计画布"),
        "VIEW": ("View controls", "视图控制"), "FIT_SELECTION": ("Fit selection", "适应选中"),
        "FIT_ALL": ("Fit all", "适应全部"), "ZOOM": ("Zoom", "缩放"),
        "ZOOM_IN": ("Zoom in", "放大"), "ZOOM_OUT": ("Zoom out", "缩小"),
        "CANVAS_LABEL": ("UI design canvas. F to fit, plus/minus to zoom, arrow keys to pan.", "UI 设计画布。F 适应全部，加减号缩放，方向键平移。"),
        "LOADING": ("Loading design canvas…", "正在加载设计画布…"),
        "PROPERTIES": ("Properties", "属性"), "NOTHING_SELECTED": ("Nothing selected", "未选择图层"),
        "SELECT_HINT": ("Click a layer to inspect it.", "点击图层查看属性。"),
        "HELP": ("Space + drag to pan · Ctrl/⌘ + scroll to zoom · F to fit", "空格拖动平移 · Ctrl/⌘ 滚轮缩放 · F 适应全部"),
        "NOSCRIPT": ("The design canvas requires JavaScript and WebGL. The document outline is available below.", "设计画布需要 JavaScript 和 WebGL，下方仍可阅读内容大纲。"),
        "OUTLINE": ("Accessible content outline", "内容大纲"),
        "LICENSES_LABEL": ("Third-party licenses", "第三方许可证"),
        "BOOT_ERROR": ("Canvas could not load. Use a recent browser with JavaScript enabled.", "画布无法加载，请使用启用 JavaScript 的新版浏览器。"),
    }
    values = {key: html.escape(pair[1 if zh else 0]) for key, pair in labels.items()}
    values.update({
        "TITLE": html.escape(scene["title"]), "DESCRIPTION": html.escape(scene["description"]),
        "LANG": html.escape(scene["lang"]), "ARTBOARD_COUNT": f"{len(scene['artboards'])} " + ("画板" if zh else "artboards"),
        "CONTENT_OUTLINE": outline(scene["artboards"]), "SCENE": json_script(scene),
        "ASSETS": json_script(payload), "RUNTIME": runtime,
        "LICENSES": html.escape((VENDOR / "LICENSES.txt").read_text()),
    })
    template = (ASSETS / "template.html").read_text()
    result = re.sub(r"@@([A-Z_]+)@@", lambda m: values[m[1]], template)
    return result, count, len(fonts) - len(manifest["fonts"])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("scene", type=Path, help="Version 1 scene JSON; see references/ui-canvas.md")
    parser.add_argument("--output", type=Path, help="Destination index.html (replaced on revisions)")
    parser.add_argument("--check", action="store_true", help="Validate scene, fonts and assets without writing HTML")
    parser.add_argument("--full-fonts", action="store_true", help="Embed full fonts instead of the default per-scene subsets")
    parser.add_argument("--extract-scene", action="store_true", help="Read scene from an existing canvas HTML; --output writes editable JSON")
    args = parser.parse_args()
    if args.extract_scene and (args.check or args.full_fonts):
        parser.error("--extract-scene cannot be combined with --check or --full-fonts")
    if not args.check and not args.output:
        parser.error("--output is required unless --check is used")
    try:
        require(args.scene.stat().st_size <= 30 * 1024 * 1024, "Scene JSON exceeds 30 MiB")
        source = args.scene.read_text(encoding="utf-8")
        if args.extract_scene:
            scene = extract_scene(source)
            output = json.dumps(scene, ensure_ascii=False, indent=2) + "\n"
            report = {"nodes": validate(scene)[0], "extracted": True, "validated": True}
        else:
            scene = json.loads(source)
            output, count, cjk_fonts = generate(scene, args.check, args.full_fonts)
            report = {"nodes": count, "cjk_fonts": cjk_fonts, "validated": True,
                      "font_mode": "full" if args.full_fonts else "subset"}
        if output is not None:
            target = args.output.expanduser().resolve()
            require(target != args.scene.resolve(), "Output must not overwrite the source scene")
            target.parent.mkdir(parents=True, exist_ok=True)
            tmp = None
            try:
                with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=target.parent, delete=False) as f:
                    tmp = Path(f.name)
                    f.write(output)
                os.chmod(tmp, 0o644)
                os.replace(tmp, target)
            finally:
                if tmp and tmp.exists():
                    tmp.unlink()
            size = target.stat().st_size
            report.update(path=str(target), bytes=size, within_publish_limit=size <= 10 * 1024 * 1024)
        print(json.dumps(report, ensure_ascii=False))
    except (ValueError, OSError, KeyError, TypeError, RecursionError) as error:
        print(f"UI canvas: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
