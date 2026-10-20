# UI design canvas

Use this mode for UI mockups, wireframes, screen variants, component arrangements,
or side-by-side desktop/mobile designs where a navigable design canvas helps.
The agent draws by authoring a scene; the reader pans, zooms, and selects design
elements. Deliver only the full-viewport canvas with compact floating navigation
controls, without editor headers, layer lists, or property panels.
The design uses OpenPencil's actual Skia renderer and Yoga
layout. It is not a screenshot inside a fake editor.

Use the regular HTML starter for prose reports, comparisons, explanations, or a
working HTML prototype with live form controls and links. A UI canvas contains
design layers: a drawn button is not a working application button. User requests
for full manual editing, Figma file import, collaboration, or production apps
need a different workflow.

## Generate and revise

1. Choose screen sizes, a coherent visual direction, and meaningful layers.
   Follow the shared design guidance, adapting it to UI rather than report layout.
2. Read [example.json](../assets/ui-canvas/example.json) as a working schema and
   composition example. Its reading product and book content are fictional.
   Replace the content and design for the user's actual subject.
3. Write `scene.json` in the artifact's output directory. This is the editable
   source for later agent revisions; retain it beside `index.html`.
4. Generate with Python 3.9+ and the pinned font-subsetting tools. Reuse a working
   environment; if missing, create this isolated environment and install once:

   ```bash
   python3 -m venv "$HOME/.cache/html-artifact/canvas-venv"
   "$HOME/.cache/html-artifact/canvas-venv/bin/python" -m pip install \
     -r <skill-directory>/scripts/canvas-requirements.txt
   ```

   Generate new artifacts and revisions with the same command:

   ```bash
   "$HOME/.cache/html-artifact/canvas-venv/bin/python" \
     <skill-directory>/scripts/create-ui-canvas.py \
     /absolute/path/to/scene.json \
     --output /absolute/path/to/index.html
   ```

   The generator embeds only glyphs required by the current scene plus a small
   renderer-label character set. It starts from the original bundled fonts on
   every run, preserves shaping dependencies and font notices, and checks glyph
   coverage. Do not manually pick glyphs or edit compressed font payloads.
   A validation-only pass is available with `--check` instead of `--output`;
   it checks source coverage and asset integrity, but does not subset or render.
   The generator returns JSON with the output path, byte size, node count, and
   `within_publish_limit`. Confirm `font_mode` is `subset` on generated output.
   It rejects unsupported fields and missing glyphs. If dependencies cannot be
   installed, report that; do not silently ship larger full fonts or use a CDN.
5. Inspect the file in a browser, including a narrow viewport and the actual
   interactions. Check text visibility, wrapping, clipping, layout, and layer
   selection. The generated artifact requires JavaScript, WebAssembly, WebGL,
   and `DecompressionStream`; target a recent Chrome, Safari, or Firefox.
6. Use the shared local save/open/delivery workflow. On revisions edit the
   existing `scene.json`, rerun the generator to the same `index.html`, and ask
   the user to refresh. Do not patch text directly in the HTML: the embedded
   scene, font subsets, and accessible outline must be regenerated together.
   When adding text, check the new words in the rendered canvas for missing
   glyphs, wrapping, or clipping. The generator writes atomically so a failed
   build leaves the existing HTML intact. The HTML works by itself; the JSON
   is a convenient authoring copy, not a runtime dependency.

Generation does not use npm, the OpenPencil source checkout, a CDN, a font
service, or a development server. Do not ask each agent to rebuild the runtime.
The runtime and fonts are already bundled under `assets/ui-canvas/vendor`.
Ordinary reports do not gain these dependencies.

### Revise when only the HTML is available

Recover its embedded source without executing the HTML (standard Python works):

```bash
python3 <skill-directory>/scripts/create-ui-canvas.py /absolute/path/to/index.html \
  --extract-scene --output /absolute/path/to/recovered-scene.json
```

Edit the recovered JSON, then use the normal generation command above to replace
the same HTML. Recover to a new filename if an existing scene may contain later
edits; resolve which is authoritative before overwriting it. Recovery validates
this template's schema; it does not convert arbitrary web pages into scenes.
New text is subset from the original vendor fonts, not the old HTML's limited
glyph set. No companion file needs to be uploaded or published.

## Scene contract (version 1)

This is a deliberately small adapter schema, not raw OpenPencil `.fig` JSON.
Unknown properties are rejected so a misspelled style cannot silently disappear.
Every node requires `type`, a nonempty `name`, `width`, and `height`.
All positions and sizes are design pixels, before viewport zoom.

```json
{
  "version": 1,
  "title": "Account screen",
  "description": "A compact account screen and its primary action.",
  "lang": "en",
  "background": "#e9eaed",
  "artboards": [
    {
      "type": "FRAME",
      "name": "Mobile · Account",
      "x": 0, "y": 0, "width": 390, "height": 844,
      "fill": "#fafaf7", "clipsContent": true,
      "children": [
        {
          "type": "TEXT", "name": "Heading",
          "x": 24, "y": 40, "width": 342, "height": 48,
          "text": "Your account", "fontSize": 30,
          "fontWeight": 700, "fill": "#243b32"
        },
        {
          "type": "FRAME", "name": "Primary action",
          "x": 24, "y": 120, "width": 342, "height": 48,
          "fill": "#244b3c", "cornerRadius": 8,
          "layout": {
            "direction": "HORIZONTAL", "padding": 12,
            "justify": "CENTER", "align": "CENTER"
          },
          "children": [
            {
              "type": "TEXT", "name": "Action label",
              "width": 318, "height": 24, "text": "Save changes",
              "fontSize": 14, "fontWeight": 600,
              "textAlignHorizontal": "CENTER", "fill": "#ffffff"
            }
          ]
        }
      ]
    }
  ]
}
```

The top level requires `version: 1`, `title`, `description`, `lang`, and
`artboards`. `background` is optional. Each artboard is a positive-sized `FRAME`;
its `x`/`y` are world coordinates. Place variants apart explicitly (for example,
the second frame at the first frame's width plus 80).

| Node fields | Supported values and behavior |
| --- | --- |
| `type` | `FRAME`, `GROUP`, `RECTANGLE`, `ELLIPSE`, `TEXT`, `LINE` |
| `children` | Array, only for frames and groups. Coordinates are relative to the parent. |
| `x`, `y` | Optional, default 0. Negative positions allowed. |
| `width`, `height` | Required. Text boxes need enough height; font size is not box height. |
| `fill` | `#RRGGBB` or `#RRGGBBAA`. Text defaults to black; other nodes have no fill by default. |
| `stroke` | `{"color":"#dce2dc","width":1}`. Inside-aligned. Use a stroke for a `LINE`. |
| `cornerRadius`, `rotation`, `opacity` | Radius in pixels, rotation in degrees, opacity 0–1. |
| `clipsContent`, `visible` | Booleans. Explicitly clip screen frames when needed. |
| `shadow` | `{"color":"#00000020","x":0,"y":8,"blur":24}`; drop shadow. |
| `image` | Embedded `data:image/png;base64,...`, JPEG, or WebP; fills the node. No URL fetching. |
| `text` | Required for `TEXT`. Newlines are allowed. |
| `fontFamily` | `Inter` (default) or `Noto Sans SC`. Chinese fallback is embedded automatically. |
| `fontSize`, `fontWeight` | Default 14 and 400. Inter weights: 400/500/600/700/800. Chinese faces: 400/700, nearest face otherwise. |
| `lineHeight`, `letterSpacing` | Pixels; omitted line height uses the renderer's font metrics. |
| `textAlignHorizontal` | `LEFT`, `CENTER`, `RIGHT`, `JUSTIFIED` |
| `textAlignVertical` | `TOP`, `CENTER`, `BOTTOM` |
| `textAutoResize` | `NONE` (default), `HEIGHT`, `WIDTH_AND_HEIGHT`. Use `HEIGHT` for wrapping text with fixed width. |
| `layout` | Frame auto layout, described below. |
| `layoutGrow` | Child flex growth along the parent's layout direction, default 0. |
| `layoutAlignSelf` | `AUTO` or `STRETCH` along the parent's cross axis. |
| `layoutPositioning` | `AUTO` or `ABSOLUTE` for a child inside an auto-layout frame. |

`image` replaces `fill`. Prefer concise layer names that explain the UI's
structure. Use frames to express actual groups such as navigation, a form, or
a card. Do not flatten an entire screen to one raster image.

### Auto layout

`layout.direction` is `HORIZONTAL` or `VERTICAL`. Optional fields:

- `gap`: nonnegative spacing between children.
- `padding`: one number or `[top, right, bottom, left]`.
- `justify`: `MIN`, `CENTER`, `MAX`, `SPACE_BETWEEN`.
- `align`: `MIN`, `CENTER`, `MAX`.
- `hug`: true lets the main axis fit content (width for horizontal, height for vertical).

Auto layout determines child positions; do not also rely on their `x`/`y`
unless the child uses `layoutPositioning: "ABSOLUTE"`. All supplied nodes still
need width/height; text is measured by Skia before Yoga runs. Desktop and mobile
artboards are separately authored designs, not automatic CSS breakpoints.

### Fonts and images

Inter is always embedded. A Simplified Chinese subset of Noto Sans SC is added
when canvas text or layer names need it. The generator checks coverage rather
than depending on the viewer's installed fonts. This includes common Chinese,
not every CJK extension or emoji. An unsupported character fails generation
with its code point: use a suitable licensed image/vector alternative where
appropriate, or extend the runtime font assets when that script is required;
do not silently replace the user's wording.

To embed a local image, set the field with standard base64, for example:

```python
node["image"] = "data:image/png;base64," + base64.b64encode(
    Path("/absolute/path/image.png").read_bytes()
).decode("ascii")
```

The example is about **4.74 MB (4.52 MiB)** with subset fonts, down from about
8.75 MB with full fonts. Most remaining bytes are the compressed rendering engine.
`--full-fonts` explicitly retains the full bundled fonts using only standard
Python; use it only when full coverage is requested or for comparison tests.
CanvasKit requires actual font data; CSS `system-ui` is not a replacement for
its canvas text fonts. The surrounding HTML controls use system fonts.

Use appropriately sized images; images can
push a file past the existing 10 MiB anonymous-upload limit. Local viewing still
works. On an explicit sharing request, inspect `within_publish_limit` and reduce
image size or unnecessary assets if needed; do not bypass the publisher's limit.
Preserve the bundled third-party notices in the generated HTML.

## Reader interactions and limits

- Wheel/trackpad scroll pans; Ctrl/Command + wheel zooms around the pointer.
- Space + drag or middle-button drag pans. Touch drag pans; pinch zooms.
- Floating zoom, 100%, and fit-all controls navigate the canvas.
- Click a design element to select it.
- With the canvas focused: `F` fits all, `Shift+F` fits the selection,
  `+`/`-` zoom, arrow keys pan, Escape clears selection.
- On narrow screens the canvas still occupies the whole viewport.

The canvas is an inspection surface. Editing is performed by the agent in the
source scene, not by dragging resize handles. This version does not expose
manual drawing tools, undo history, component instances, vectors/pen paths,
gradients, arbitrary fonts, `.fig` import/export, or HTML/CSS code generation.
Use the supported primitives to draw the requested mockup; do not imply these
unexposed features exist just because upstream supports them.

The semantic content outline is visually hidden during normal viewing, available
to assistive technology, and revealed without scripts or for printing. It is not
a static rendering of the screen. For runtime architecture,
provenance, or maintenance, read [open-pencil-integration.md](open-pencil-integration.md).
