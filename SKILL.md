---
name: html-artifact
description: Create or revise portable HTML artifacts for explanations, reports, comparisons, interactive explorations, small local tools, and UI designs on an OpenPencil canvas. Save and open locally; upload only when requested. In Claude Code, prefer an available built-in artifact workflow unless this skill is explicitly requested. Not for production websites, full applications or design editors, or ordinary short chat answers.
---

# HTML artifact

Design a visual answer around what the reader needs to understand, decide, or do. Deliver it as one portable HTML file. The content determines the interface, composition, and amount of interaction.

## Start with the reader's task

Identify what the reader must understand, decide, or do, and which relationships the artifact must make perceptible. Choose the representation around those relationships. The user's requested format and visual direction take priority; otherwise make reasonable design decisions without requiring a layout specification. Consult [composition.md](references/composition.md) when the information structure needs thought.

Use supplied or verified facts, distinguish evidence from inference, and label illustrative data. Keep uncertainty next to the claim it qualifies, including in the headline or recommendation. A polished page must not imply that an estimate is measured or a proposed action is complete.

## Choose the rendering approach

For a new visual direction in either approach, read [design.md](references/design.md). It guides visual decisions without prescribing a palette or page style.

- **HTML/CSS/SVG/JavaScript is the general approach.** It supports reading, diagrams, controls, and small working prototypes. Design the page for this task; there is no shared page shell, preset section sequence, or required visual style. Read [html.md](references/html.md) when implementing or substantially revising an HTML artifact.
- **OpenPencil is for spatial UI design.** Use [ui-canvas.md](references/ui-canvas.md) for fixed artboards, screen variants, wireframes, or component arrangements that benefit from a Figma-like canvas with pan, zoom, and layer inspection. Read it before writing the scene. The result is the canvas with compact navigation controls, without editor headers or side panels. Drawn controls are design layers; use ordinary HTML for controls the reader needs to operate.
- A small explanatory diagram does not need the UI canvas engine. Full design editing, production apps, and backend services need a different workflow.

Single-file delivery constrains the result, not the authoring process. Use native browser capabilities where sufficient; modular source and a bundled library are reasonable when they materially simplify a complex artifact. The delivered file must open locally without a server, package installation, or required network requests.

In Claude Code, prefer an available built-in artifact workflow unless the user explicitly chooses this skill or that workflow cannot meet the delivery needs. Determine availability from exposed capabilities; do not infer it from the product name. The selected built-in workflow governs its own delivery.

## Compose and build

Use [design.md](references/design.md) to resolve open visual decisions. Its judgment criteria apply to either rendering approach; the implementation reference supplies the technical contract. Keep working design deliberation out of the delivered artifact unless the user requested it.

Use interaction when changing state helps the reader answer a question or complete the task. Make inputs, consequences, and scope clear. For a reading task, a well-composed static page may be complete. For an operated tool, put useful state and actions where the reader can find them.

Match the requested language, or the conversation language when unspecified. Give the file an appropriate `lang`, a descriptive title, and default `noindex,nofollow` metadata. Use system fonts or licensed embedded fonts. The canvas generator handles its own embedded font subsets.

## Revise the existing artifact

Read the existing file and any authoritative source before editing. Keep its path and useful visual decisions unless the user asks for a redesign or changes the task enough to require a different composition. New requirements can change the organization; preserving a design does not mean keeping an unsuitable structure.

Update the content model and all dependent representations together: calculations, labels, diagrams, explanations, examples, and static/print fallbacks. If built from source, regenerate the delivered HTML and verify that file rather than only the development preview.

For UI canvas revisions, edit the scene and regenerate with the bundled packer so text, font subsets, and the semantic outline stay consistent. Recover the scene with `--extract-scene` when only the HTML remains; follow the canvas reference rather than patching compressed payloads.

## Verify and deliver

Check whether the reader can perform the intended task. Verify important calculations and distinguish supported conclusions from unknowns. For new or materially changed layouts and interactions, inspect the final file in a browser at desktop and narrow widths. Check whether the intended hierarchy and visual character survive in the actual rendering. Exercise meaningful states, including the state with the most content; a layout can avoid overflow while misrepresenting order, direction, or comparison. See [html.md](references/html.md) for targeted checks. Routine text edits do not require a full screenshot suite.

Honor the requested output location and keep the existing path on revisions. For a new artifact without a specified location, infer the active agent's data directory from the current session, relevant environment variables, and host configuration; the skill's installation path can corroborate this, but an unrelated agent directory merely existing is not enough. Respect a configured home (for example, `CODEX_HOME`); otherwise use the identified host's usual directory, such as `~/.codex` for Codex or `~/.workbuddy` for WorkBuddy. Save under `<agent-data-directory>/artifacts/<topic>-<unique-suffix>/index.html`. If the host cannot be identified reliably, use `artifacts/<topic>-<unique-suffix>/index.html` in the current workspace. Resolve an absolute path on this machine, use a separate directory for each new artifact, and retain editable sources beside the HTML when needed.

Return an absolute file link and open the first completed artifact with the system default application, unless the user says not to open it. Use `open` on macOS, `xdg-open` on Linux, or PowerShell `Invoke-Item -LiteralPath` on Windows, passing the path as a safely quoted argument. On revisions, keep the path and tell the user to refresh; open again only when requested. If opening is unavailable or fails, keep the file and report the limitation. Report checks actually performed; a successful open command is not visual verification.

Upload only when explicitly asked to upload, publish online, obtain a shareable URL, or update a hosted artifact. Creation, preview, opening, and ordinary revision requests stay local. Authorization applies to the specified artifact and operation; previous uploads do not authorize subsequent uploads unless ongoing synchronization was requested. Do not ask again for an already authorized action.

For an authorized upload, read [publishing.md](references/publishing.md) and use the bundled here.now workflow, unless another provider was requested. Respect existing local-only, confidentiality, and audience constraints. Never upload as a fallback for local opening failure.
