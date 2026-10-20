# OpenPencil integration notes

## Source and version boundary

The upstream repository was cloned to `~/Works/open-pencil` for analysis.
The inspected checkout was `d8a2b15c27bdfe9b28a255f354441973efddb553`.
The shipped runtime deliberately uses the published **0.16.0** packages with a
lockfile, corresponding to tag `v0.16.0` at
`ffe2fc5798468988a5943c5f5737905c3c7a28b5`.
The local clone is a research reference, not an installation/runtime dependency.

Do not assume current `master` APIs exist in the published release. For example,
the inspected master renderer has read-only selection behavior that the shipped
0.16.0 renderer does not. This host uses the public code-focus overlay to show
selection without presenting nonfunctional resize or rotation handles.

## Components worth reusing

| Upstream source | Role in this template |
| --- | --- |
| `packages/scene-graph/src/index.ts`, `node-defaults.ts`, `types.ts` | Scene nodes, nested transforms, IDs, images, and deep hit testing. Imported through `@open-pencil/scene-graph`. |
| `packages/core/src/canvas/renderer.ts` | `SkiaRenderer` renders the real scene. Includes native typography, clipping, fills, shadows, labels, and overlays. Imported through `@open-pencil/core/canvas`. |
| `packages/core/src/canvaskit.ts` | One CanvasKit loader. Its `locateFile` points at an in-memory WASM Blob instead of a server path. |
| `packages/core/src/layout.ts` | `layoutAuthoredNodes` measures authored text and runs Yoga. Text measurement is supplied by the actual Skia renderer. |
| `packages/core/src/geometry/scene.ts` | World-space bounds, including rotated/nested nodes, for fit-to-selection. |
| `packages/core/src/text/fonts.ts`, `canvas/renderer/fonts.ts` | Font registration, fallback, and glyph readiness. Bundled-font URLs map to in-memory font Blobs; online providers are disabled. |
| `packages/vue/src/canvas/surface/*` | Studied for surface ownership, resizing, and teardown. Not imported; the host has no Vue dependency. |
| `packages/core/src/editor/*`, `packages/vue/src/canvas/useCanvasInput.ts` | Full editing state and input. Not needed for agent-authored, inspectable mockups. |

The separation is:

```text
scene.json → small validated adapter → OpenPencil SceneGraph
                                    → Skia text measurement → Yoga layout
                                    → SkiaRenderer → CanvasKit / WebGL
Canvas-only HTML host → pan / zoom / hit test / selection
```

We reuse rendering and layout instead of recreating them in Canvas2D or SVG.
The UI shell, adapter schema, file packer, and view controls are owned here.
No upstream application shell, account system, AI chat, MCP server, desktop
integration, collaboration, or complete manual editor is instantiated.
Some shared upstream helpers survive tree shaking; the exact bundled package
inventory is in `assets/ui-canvas/vendor/manifest.json`.

## Packaging decisions

- The maintainer build uses public package exports and produces one tree-shaken
  ES module. Yoga includes its WASM in its package; CanvasKit's WASM is a separate
  build input.
- JS, CanvasKit WASM, and fonts are gzip-compressed on disk. The Python generator
  embeds them as base64; the browser decompresses them locally. There are no
  required companion files, runtime package installation, or CDN requests.
- The plain module source is about 1.5 MB and CanvasKit WASM about 7.2 MB before
  compression. Actual byte sizes and hashes are recorded in the manifest.
- Inter Regular/Medium/SemiBold/Bold/ExtraBold are bundled. Noto Sans SC
  Simplified Chinese Regular/Bold are included only when needed. Font coverage
  comes from actual font cmaps, not an assumed Unicode interval.
- The packer defaults to per-scene fontTools subsetting and WOFF2 encoding.
  It keeps all supported faces, current text/layer labels, ASCII renderer labels,
  shaping dependencies, and name/license metadata. Every revision reads original
  vendor fonts again. `--full-fonts` is an explicit diagnostic/full-coverage mode.
  The example falls from about 8.75 MB to 4.74 MB without fetching fonts online.
- Browser CSS font shards cannot simply be registered repeatedly as the same
  family/style in this release: the initial prototype reported exhausted glyph
  coverage and rendered blank Chinese text. The complete Simplified Chinese
  source face fixes this. A generated per-scene subset remains one face per
  family/style, verified by readiness, unchanged measured layout, and full-font/
  subset screenshot comparison allowing small glyph-edge rasterization differences.
- The viewport redraws on demand. ResizeObserver resizes the Skia surface;
  fit-to-selection uses upstream transformed bounds. The host releases surfaces,
  GL context registrations and Blob URLs when the page is discarded.
- Fonts and images never fetch user-content URLs. HTML/script payloads are
  escaped, and the generator verifies bundled
  asset hashes. A semantic text outline survives disabled scripts.
- Node-only branches from upstream remain guarded and externalized in the
  browser bundle. This host does not call file importers or server font loaders.
  Browser tests block HTTP(S) to catch accidental activation of remote services.

This is a pragmatic rendering subset. The adapter does not expose the entire
upstream scene model. Expanding it should be driven by a concrete design need,
with a valid scene example, runtime mapping, documentation, and a render check.

## Maintenance

Normal artifact generation uses Python with fontTools/Brotli installed according
to [the canvas guide](ui-canvas.md); no npm build is required.
To change runtime code or update
upstream dependencies, use Node 22.18+ and npm:

```bash
npm ci
npm run build:canvas
CANVAS_PYTHON="$HOME/.cache/html-artifact/canvas-venv/bin/python" npm run test:canvas
"$HOME/.cache/html-artifact/canvas-venv/bin/python" scripts/create-ui-canvas.py assets/ui-canvas/example.json \
  --output /absolute/path/to/preview/index.html
```

Browser tests use installed Google Chrome by default. Set `CHROME_PATH` to an
installed Chromium executable when needed. Screenshots go to ignored
`.canvas-build/desktop.png` and `.canvas-build/mobile.png`; inspect them after
pixel-affecting changes.

Commit the lockfile and the generated `vendor` assets together with runtime
changes. The generator rejects a runtime source hash that does not match the
bundled build. Do not force-update every upstream dependency while adjusting
the template; update deliberately and verify the public APIs against the
installed version.

`build-canvas-runtime.mjs` aggregates license files from packages whose code
survives tree shaking, and includes font notices. The Inter OFL notice is from
upstream `tests/fixtures/fonts/Inter-OFL.txt`. The Yoga package does not ship its
license file; the retained copy is from
<https://github.com/open-pencil/yoga/blob/main/LICENSE>.
CanvasKit's distributed package supplies its BSD license. Preserve the notices
and upstream identities when rebuilding or redistributing generated HTML.

Validation covers recovery from standalone HTML, deterministic regeneration,
new glyphs on revision, full-font/subset render comparison, the canvas-only viewport,
real `file://` rendering with HTTP(S) blocked, Chinese glyph
pixels, all example text readiness, Yoga child positions, nested layer picking,
pan/zoom, responsive resizing, data escaping, and script-disabled outlines.
It is not a large-document performance benchmark or proof of parity with every
Figma feature. Chrome is the browser exercised by the automated suite; other
browsers need their own verification before claiming support.
