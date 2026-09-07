# Artifact design

Lightweight means a self-contained page without a build pipeline or unnecessary runtime dependencies. It does not limit visual ambition. Give every artifact deliberate typography, color, composition, and content structure; scale the treatment to the subject and audience.

## Choose a direction

User direction takes precedence, followed by a relevant existing design system, followed by your choices. Inspect an obvious theme or token file when matching a product matters; do not search an entire project for incidental styling.

Before writing HTML, make a short internal design plan:

- Subject and purpose: who will read this, what should they understand or decide, and what makes this subject distinctive?
- Palette: choose a small set of named colors for grounds, text, accents, and meaningful states. Choose neutrals deliberately; do not inherit a generic palette by accident.
- Typography: assign display, body, and code/data roles; choose a consistent size and spacing scale.
- Composition: describe how the layout reveals the argument, and where the page's visual focus belongs.

Use real content while designing. The starter is a fallback, not a signature look to repeat across unrelated subjects. For revisions, preserve the existing direction unless the request calls for changing it.

## Match the treatment

A memo or implementation plan can be quiet and beautifully composed. A presentation, feature introduction, or public-facing explainer can use a stronger visual identity, larger typography, illustration, and purposeful motion. Infer the appropriate treatment from the request; the user need not separately ask for good design.

For a more expressive page, check the proposed direction before building: would the same palette, heading, and hero fit almost any topic? If so, make the treatment more specific. Choose one strong focal idea and let the surrounding layout support it. Add a large hero only when its content earns the space. Precision matters as much in restrained layouts as in elaborate ones.

Avoid habitual styling such as identical rounded cards, centered everything, decorative emoji labels, arbitrary gradients, or repeated numbered sections. These are not forbidden styles: follow them when requested or when they communicate something real.

## Typography and copy

Give headings and body copy distinct roles through family, size, weight, or spacing; separate families are useful but not mandatory. System fonts can produce a distinctive pairing. If a custom font materially improves the direction and an appropriately licensed font is available, embed it with a data URI and keep the fallback stack usable. Do not make local reading depend on remote font services. With an explicit request allowing online dependencies, check the target host's font policy instead of assuming Claude's rules apply elsewhere.

Include Chinese font fallbacks. Do not apply Latin uppercase styling or tracking to Chinese body text. Keep running text at a comfortable measure (roughly 60–70 characters for Latin prose; adjust for the actual script). Let headings balance and give body text room to breathe. Use tabular numerals for aligned data.

Give the document a recognizable name in both the browser title and main heading. Prefer a specific subject or a concrete question over a generic category like “Analysis Report.” Put a supporting explanation in the subtitle rather than appending filler to the title. Natural language matters more than a fixed word count.

Write for a reader who has not seen the conversation. Lead with the point; place evidence near the claim. Name concepts and controls in the reader's vocabulary. Controls state what they do, and error messages explain the problem and a useful next step.

## Structure carries meaning

Choose structures that fit the task, using only the parts needed:

- Comparisons: use shared criteria across alternatives, then explain the recommendation and the conditions that would change it.
- Incident or case reviews: connect impact, sequence of events, causal evidence, and actions with observable acceptance criteria.
- Implementation plans: show dependencies and stages, the important data flow, risky boundaries, and unresolved decisions. Include a small mockup when it resolves ambiguity.
- Concept explainers: start with the question, show the mechanism, then its consequences and limitations. Use a focused interaction when changing one variable makes the mechanism easier to understand.

These are options, not mandatory section templates. Do not invent metrics, schedules, owners, or evidence to fill them. Numbering should indicate an actual sequence. Labels, dividers, and color should express grouping, importance, or state.

Keep conclusions, key evidence, and core comparisons visible. Native disclosure can hold supplementary logs and long code. For an operated tool, surface state and useful actions before detail; make interactive elements recognizable. Semantic warning/success colors are separate from decorative accents and need text or shape cues too.

## Layout and themes

Use grid or flex with gap for sibling groups. Give tables, code, and diagrams their own overflow containers so the whole page never scrolls sideways. Reflow comparisons on narrow screens. Keep selectors simple enough that component and section styles do not silently override spacing.

Define complete theme palettes with CSS variables, then style components through those variables. Set the body background explicitly. Avoid mixing a fixed light-theme foreground with a dark-theme surface, including inside charts and SVG.

For local files, system light/dark preferences are sufficient. If the target viewer or an intentional page control supplies `data-theme`, support all three states: no attribute follows the OS, explicit light overrides a dark OS, and explicit dark overrides a light OS. Guard the system dark palette with `:root:not([data-theme="light"])`; define explicit dark separately. Do not require a theme toggle or add a script only to simulate a nonexistent host. A deliberate single-theme design is also valid when every foreground and background is explicitly set.

## Graphics, interaction, and checks

Use inline SVG for meaningful diagrams; read diagrams.md for its mechanics. For an expressive graphic that would require long decorative path data, consider a small Canvas implementation or a suitable embedded image. Preserve an accessible explanation and useful static content. Do not introduce WebGL or a graphics library unless the requested visual actually needs it.

Motion can establish hierarchy or explain a transition. Use it where it serves the page, keep it restrained elsewhere, and respect reduced-motion preferences. Avoid entrance effects that leave essential content invisible when JavaScript fails. Interaction is welcome when it improves understanding or operation; a static document is complete without it.

Use semantic HTML, visible keyboard focus, legible contrast, and descriptive links. Provide useful print output: light paper, unclipped tables/code, and visible core content.

When changing composition, adding a diagram, or adding interaction, inspect the rendered result at a desktop and narrow width. Check theme contrast, overlapping labels, overflow, and the actual interaction as applicable. Skip repeated layout checks for routine text edits. A successful system-open command is not visual verification; report limitations if no inspection tool is available.
