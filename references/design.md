# Document design

- Start with the page's specific subject and a concise takeaway. The body should make sense to a reader who has not seen the conversation. Use meaningful headings rather than generic section labels.
- Plans, reports, and technical introductions normally need restrained document design. Reserve elaborate visual identity for requests that call for it. A huge hero, animation, or full application shell usually wastes space here.
- User direction takes precedence, followed by a relevant existing design system, followed by your choices. Do not scan an entire project just to discover its visual style; inspect an obvious theme file only when matching the product matters.
- Choose a small palette, distinct heading/body/code roles, and a spacing rhythm. The base file is a fallback, not a signature look for every topic. System fonts are sufficient; do not fetch fonts just to make a report distinctive. Include Chinese font fallbacks and avoid letter-spacing on Chinese body text.
- Keep paragraphs at a comfortable reading width; allow figures, tables, and comparisons more width. Use grid/flex gap for sibling layout. Stack comparison columns on narrow screens. Give wide tables and code their own scroll container instead of widening the whole page.
- Make whitespace and type hierarchy do most of the work. Use color for emphasis or meaning, paired with text labels. Avoid turning every section into an identical rounded card. Numbers imply sequence only when sequence is real.
- Keep all essential information visible. A detail fold can hold supplementary logs or long code, but do not bury the conclusion, evidence, or key comparison behind controls.
- Set foreground and background explicitly through a coherent token palette. The base supports system light/dark preferences without a theme-switching script; retain both palettes together, or intentionally choose one complete theme. Do not depend on a host's injected theme attributes.
- Use legible contrast, visible keyboard focus, descriptive links, and semantic headings. Use tabular numerals for aligned data. Respect reduced-motion preferences if motion is requested.
- Provide useful print output: avoid clipped scroll regions and dark paper backgrounds. Browser print/PDF is an affordance, not a claim of publication-quality PDF validation.

For revisions, edit the existing document rather than regenerating its whole style. Keep the output proportional to the explanation: a small page may need only a title, two sections, and one comparison.
