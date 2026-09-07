# Figures that explain

Use a figure when the reader needs to see a relationship, path, boundary, or change. A sentence is preferable when it explains the same thing faster.

- Draw the mechanism: what moves, which component acts, and where a boundary is crossed. A collection of named boxes without relationships adds little.
- For alternatives, show the differing paths or components on a common basis. Preserve the relevant detail without inventorying the whole system.
- Label arrows with actual actions or data. Keep one main claim per figure and explain it in a nearby caption.
- Use native inline SVG shapes and text with a content-sized `viewBox`. No rendering library or Mermaid runtime is necessary for a small standalone HTML figure.
- Align shapes on a simple grid. Reserve space around labels and arrowheads; do not shrink a wide diagram until the text is unreadable. Reflow the diagram or scroll its own container on narrow screens.
- Use page color tokens or `currentColor`, including arrowheads. Give reusable IDs a figure-specific prefix. References must resolve inside the same file.
- Wrap the figure in `figure`/`figcaption` and give SVG an accessible title or label. Keep long explanations in the caption, not inside boxes.
- Do not add hover states, clickable nodes, animation, or filters unless the user needs those behaviors.
