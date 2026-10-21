# Implement and verify portable HTML

## Delivery contract

Deliver one complete HTML file that works from a local `file:` URL. Inline required CSS, JavaScript, SVG, images, fonts, and any bundled runtime assets. No required server, network fetch, package installation, or companion asset file at reading time. Source files may remain beside it for editing; they are not runtime dependencies.

Include a doctype, UTF-8 encoding, viewport metadata, an appropriate `lang`, a descriptive title, and `<meta name="robots" content="noindex,nofollow">`. Preserve noindex on revisions unless the user explicitly requests indexing. It is a crawler instruction, not access control; a blanket robots.txt block can prevent crawlers from reading it.

Use native HTML/CSS/SVG and small scripts where they suffice. If complexity warrants a library or modular source, bundle the required code and assets into the final file and retain relevant licenses. Do not introduce a framework or build step for a simple page. Single-file delivery does not require authoring everything in one source file.

Escape supplied text for its output context. Serialize embedded data safely, including script-closing sequences; do not treat user content as markup or executable code. Avoid fetching sibling JSON or importing external modules from a file URL.

## Theme state

A single deliberate theme is valid. If implementing system light/dark preferences or an actual host/user theme control, absence of `data-theme` follows the OS; explicit light overrides a dark OS, and explicit dark overrides a light OS. Apply the selected palette consistently to text, surfaces, charts, form controls and SVG arrowheads. Do not add host-simulation scripts for a host that does not exist.

## State and durable editing

When multiple views depend on the same data, derive them from one model where practical. Keep input assumptions, calculations, and presentation separate enough to revise reliably. Generate static tables or explanations from the same source when there is a build step; otherwise check them explicitly after changing data.

Use real controls with visible labels, valid ranges, and useful invalid/empty states. Support keyboard operation and visible focus. Let the reader see the result of an action without searching a distant section; announce important changing state when appropriate. A disabled control should communicate why it cannot act.

For reading artifacts, preserve the main explanation and evidence without scripts. For an inherently interactive tool, provide a meaningful initial/static example or a clear description of what requires JavaScript; do not present inert controls as working. Printing should preserve useful content, with unclipped text and data, and distinguish a current scenario from general conclusions.

## Inline figures

For small diagrams use native SVG shapes and text with a content-sized `viewBox`. Align related elements and reserve room for labels and arrowheads. Avoid long decorative path data when simpler geometry or an embedded image would work.

Use page tokens or `currentColor`, including arrowheads. Prefix reusable IDs per figure so local references cannot collide. Use `figure`/`figcaption`, accessible SVG titles or labels, and captions for long explanations.

Do not shrink wide diagrams until labels are unreadable. Reflow or use a locally scrollable region with discoverable content. Preserve direction and label associations in both layouts. Hover, motion, and clickable nodes are optional and should serve the reader's task.

## Targeted verification

Inspect the delivered file, not only a source or development preview. For new or substantially changed layouts/interactions:

- Open it locally with network unavailable or blocked. Check missing assets, script errors, anchors, and required metadata.
- Inspect desktop and a narrow width appropriate to the audience. Read the actual visual relationships: order, alignment, direction, chart scales, and association between labels and values. No overflow is necessary but not sufficient.
- Exercise important transitions and the state most likely to crowd the layout. Verify a few consequential outputs against an independent calculation or the supplied facts, including boundaries and invalid input where relevant.
- Check keyboard access, contrast under the supported theme, and legibility. Inspect the script-disabled/print presentation when it carries meaningful content.
- On revision, check changed facts and all dependent representations, then repeat only the rendering or interaction checks affected by the change.

Fix material failures and stop when the task works. Do not impose a universal screenshot matrix, unsupported accessibility certification, or repeated decorative polish. If a check is unavailable, state that limit; report actual observations rather than “fully tested.”
