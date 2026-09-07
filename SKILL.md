---
name: html-artifact
description: Primarily for non-Claude Code environments. Create or revise standalone HTML explainers, reports, comparisons, and case reviews, delivering an anonymous temporary link by default. In Claude Code, prefer its built-in artifact capability when available; use this skill only as a fallback or when explicitly requested. Not for production websites, apps, or ordinary short chat answers.
---

# HTML artifact

Turn the requested content into a page worth reading. Default to a static document with purposeful typography and layout. Interaction is optional, not a quality target.

## Environment and trigger priority

- This skill primarily handles artifact requests in non-Claude Code environments, such as Codex.
- In Claude Code, use an available built-in artifact capability first. Do not invoke this skill's file-generation or anonymous-upload workflow merely because the user says “artifact”. Use this skill there only when the built-in capability is unavailable or does not meet the requested delivery needs, or the user explicitly chooses this skill's workflow.
- Determine availability from the current environment's exposed capabilities; do not assume every Claude Code installation has the same tools. When the built-in path is selected, its delivery workflow takes precedence and this skill's default upload does not apply.

## Authoring

- Write the page in the language requested by the user, or match the conversation language when unspecified. Set the HTML `lang` attribute accordingly.
- Identify the audience, the page's main point, and the relationship the layout should reveal. Keep this design choice brief and internal unless the user asks for options.
- Read [design.md](references/design.md) for the first page in a thread. Read [diagrams.md](references/diagrams.md) only when a figure would materially help. Do not load unrelated design or interactive-visualization workflows just to produce this document.
- Reuse [base.html](assets/base.html) as a small starting skeleton. Adapt its palette and layout to the subject or an existing user-provided design system; it is not a required visual template. Preserve the existing design on revisions unless a redesign is requested.
- Write one complete HTML file, with inline CSS and any necessary inline SVG. Use system fonts with Chinese fallbacks. No required network resources, build tools, package installs, or development server. The page must work when opened as a local file.
- Default to no JavaScript. Native anchors and `details` are enough for most navigation and disclosure. Add scripts only for a requested or clearly useful interaction; keep the core explanation visible without running them.
- Use real supplied or verified content. State unknowns and label illustrative numbers. Keep source links close to the relevant claims when research is involved.
- Match the structure to the content: comparisons can be parallel, changes can be before/after, processes can have a diagram. Well-composed prose is also a valid artifact. Do not invent dashboard metrics, controls, diagrams, or cards to fill space.

## Case reviews for nontechnical readers

When reviewing user problems or when an overview is too abstract, organize around a few concrete cases. Place short, verified dialogue excerpts or tool-result summaries beside plain-language annotations: what the user wanted, what happened, where the behavior failed, and its impact. Follow each case with a specific proposed fix and an observable acceptance criterion. Keep the key explanation visible; put IDs, code excerpts, and detailed evidence in native `details` blocks.

Distinguish direct evidence, inferred causes, and proposed behavior. An assistant's explanation of its own failure is a claim to verify, not a root cause by itself. Match quotations to the source, preserve their context, and explicitly correct earlier conclusions when new evidence contradicts them. Avoid treating successful tool execution as proof that the user's task succeeded.

## Save, inspect, deliver

- Honor an explicit output location. Otherwise create `~/.codex/artifacts/<topic>-<unique-suffix>/index.html`, expanding the path on the current machine. Choose a new directory for a new artifact; do not overwrite unrelated work. Keep the same path when revising an artifact in this thread.
- Check the finished file once for incomplete placeholders, broken anchors, overflow-prone layouts, missing sources, and external dependencies. Use a browser check when a new or materially changed layout or script needs it. Do not impose a screenshot suite or repeated polish loop on routine documents; report only checks actually performed.
- When this skill's workflow is selected under Environment and trigger priority, publish the completed HTML through Temporary sharing below and return the temporary URL, viewing password, and retention notice by default. This upload behavior is disclosed in the README; do not require a separate “upload” instruction for the default workflow. An explicit local-only, no-upload, confidentiality, or other sharing constraint overrides this default; then return the local file link. The shared service password is not private authentication: do not publish content outside the user's authorized audience.
- Use the bundled anonymous Drop method for artifact delivery, not Sites, a new hosted application, or an authenticated deployment. Use a different method only when the user requests it. On a publishing failure, preserve the HTML and explain the failure instead of switching providers.
- Publish only the reviewed single-file HTML; keep raw transcripts and evidence dumps local. Mark internal source links as requiring internal access and remove local download links from the shared copy. Open the result when a preview is requested or already agreed; do not claim browser verification unless performed.

## Temporary sharing

After completing and checking the HTML, run the bundled curl-based shell script:

```bash
bash <skill-directory>/scripts/publish.sh /absolute/path/to/index.html
```

- Requires Bash 3.2+, curl 7.55+, jq, and one of `sha1sum`, `shasum`, or `openssl`; no Python, Node, Netlify CLI, account, or login configuration. If a dependency is absent, report it rather than silently installing tools or changing providers.
- The script uploads only that file as `/index.html`, using anonymous Netlify Drop endpoints. Relative assets are not uploaded; finish the self-contained file first.
- Return the JSON `url`, viewing `password`, and retention notice. Unclaimed sites last about one hour; do not promise a custom TTL. The viewing password is a shared service default, not private authentication.
- The private receipt contains the claim token and references an immutable HTML snapshot. Do not display its contents or include it in the uploaded page. Do not claim the site or switch to an authenticated deployment unless requested.
- API readiness is not visual verification. Check in a browser when needed, and state the verification actually performed.
- On failure, report the failed stage and keep the local HTML. If a receipt has valid deployment IDs, continue that same deployment with `bash <skill-directory>/scripts/publish.sh --resume /absolute/path/to/receipt.json`; this never creates another deployment. If creation had an ambiguous outcome and no IDs were saved, stop for investigation. Do not loop over new deployments, bypass limits, or silently use another provider. The endpoints follow Netlify's CLI implementation but are not yet part of its formal OpenAPI specification; inspect the current implementation if the contract changes.
- Use `--dry-run` to validate the input without uploading.

Implementation reference: https://github.com/netlify/cli/blob/main/src/utils/deploy/drop-api.ts

Example: “Use html-artifact to explain this change to developers without prior context. Cover the motivation, before/after behavior, and a flow diagram if useful. Keep the page static.”
