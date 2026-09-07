---
name: html-artifact
description: Primarily for non-Claude Code environments. Create or revise standalone HTML explainers, reports, comparisons, and case reviews, saving and opening the HTML locally by default, with temporary hosting only when explicitly requested. In Claude Code, prefer its built-in artifact capability when available; use this skill only as a fallback or when explicitly requested. Not for production websites, apps, or ordinary short chat answers.
---

# HTML artifact

Turn the requested content into a page worth reading. Default to a static document with purposeful typography and layout. Interaction is optional, not a quality target.

## Environment and trigger priority

- This skill primarily handles artifact requests in non-Claude Code environments, such as Codex.
- In Claude Code, use an available built-in artifact capability first. Do not invoke this skill's file-generation or anonymous-upload workflow merely because the user says “artifact”. Use this skill there only when the built-in capability is unavailable or does not meet the requested delivery needs, or the user explicitly chooses this skill's workflow.
- Determine availability from the current environment's exposed capabilities; do not assume every Claude Code installation has the same tools. When the built-in path is selected, its delivery workflow takes precedence and this skill's local-file delivery steps do not apply.

## Authoring

- Write the page in the language requested by the user, or match the conversation language when unspecified. Set the HTML `lang` attribute accordingly.
- Identify the audience, the page's main point, and the relationship the layout should reveal. Keep this design choice brief and internal unless the user asks for options.
- Read [design.md](references/design.md) for the first page in a thread. Read [diagrams.md](references/diagrams.md) only when a figure would materially help. Do not load unrelated design or interactive-visualization workflows just to produce this document.
- Reuse [base.html](assets/base.html) as a small starting skeleton. Adapt its palette and layout to the subject or an existing user-provided design system; it is not a required visual template. Preserve the existing design on revisions unless a redesign is requested.
- Write one complete HTML file, with inline CSS and any necessary inline SVG. Use system fonts with Chinese fallbacks. No required network resources, build tools, package installs, or development server. The page must work when opened as a local file.
- Default to `<meta name="robots" content="noindex,nofollow">` inside `<head>`, including when revising HTML that did not use the starter. Preserve this on revisions unless the user explicitly requests indexing. This is a crawler instruction, not access control; do not add a blanket robots.txt crawl block that prevents crawlers from reading noindex.
- Default to no JavaScript. Native anchors and `details` are enough for most navigation and disclosure. Add scripts only for a requested or clearly useful interaction; keep the core explanation visible without running them.
- Use real supplied or verified content. State unknowns and label illustrative numbers. Keep source links close to the relevant claims when research is involved.
- Match the structure to the content: comparisons can be parallel, changes can be before/after, processes can have a diagram. Well-composed prose is also a valid artifact. Do not invent dashboard metrics, controls, diagrams, or cards to fill space.

## Case reviews for nontechnical readers

When reviewing user problems or when an overview is too abstract, organize around a few concrete cases. Place short, verified dialogue excerpts or tool-result summaries beside plain-language annotations: what the user wanted, what happened, where the behavior failed, and its impact. Follow each case with a specific proposed fix and an observable acceptance criterion. Keep the key explanation visible; put IDs, code excerpts, and detailed evidence in native `details` blocks.

Distinguish direct evidence, inferred causes, and proposed behavior. An assistant's explanation of its own failure is a claim to verify, not a root cause by itself. Match quotations to the source, preserve their context, and explicitly correct earlier conclusions when new evidence contradicts them. Avoid treating successful tool execution as proof that the user's task succeeded.

## Save, inspect, deliver

- Honor an explicit output location. Otherwise create `~/.codex/artifacts/<topic>-<unique-suffix>/index.html`, expanding the path on the current machine. Choose a new directory for a new artifact; do not overwrite unrelated work. Keep the same path when revising an artifact in this thread.
- Check the finished file once for incomplete placeholders, broken anchors, overflow-prone layouts, missing sources, missing noindex metadata, and external dependencies. Use a browser check when a new or materially changed layout or script needs it. Do not impose a screenshot suite or repeated polish loop on routine documents; report only checks actually performed.
- Default to local delivery: return an absolute file link and open the completed file with the operating system's default application after the first generation. On macOS use `open "/absolute/path/to/index.html"`; on Linux use `xdg-open "/absolute/path/to/index.html"`; on Windows use PowerShell `Invoke-Item -LiteralPath 'C:\absolute\path\index.html'`. Pass the path as a safely quoted argument, not executable text. Honor an explicit “do not open” or “only generate the file” instruction.
- For revisions of an already opened file, keep the same path and tell the user to refresh the existing page rather than opening duplicate tabs. Open again if the user requests it. If the system opener is unavailable or fails, retain the file, report the limitation, and return its absolute path; never upload as a fallback. A successful open command is not visual verification.
- Upload only when the user explicitly asks to upload, publish online, obtain a shareable web URL, or update the hosted version of this artifact. “Create an artifact,” “preview,” “open,” and ordinary revision requests do not authorize uploading. Authorization covers the specified artifact and operation; a previous upload does not authorize later uploads or revisions unless the user explicitly requested ongoing synchronization. Do not ask about uploading after every local delivery, and do not ask again when the requested upload is already authorized.
- Respect local-only, no-upload, confidentiality, and audience constraints. Anonymous hosting is accessible to anyone with the URL. When upload is requested, follow Temporary sharing and return the URL, expiry time, and retention notice alongside the local file.

## Temporary sharing

Only after an explicit upload request, publish the reviewed single-file HTML through the bundled anonymous here.now method. Keep raw transcripts and evidence dumps local; mark internal source links as requiring internal access and remove local download links from the shared copy. Use a different provider or authenticated deployment only when requested. On failure, preserve the HTML and explain the failure instead of switching providers.

After completing and checking the HTML, run the bundled curl-based shell script:

```bash
bash <skill-directory>/scripts/publish.sh /absolute/path/to/index.html
```

- Requires Bash 3.2+, curl 7.55+, jq, and one of `sha256sum`, `shasum`, or `openssl`; no Python, Node, provider CLI, account, or login configuration. If a dependency is absent, report it rather than silently installing tools or changing providers.
- The script uploads only that file as `/index.html` through here.now's anonymous API. Relative assets are not uploaded; finish the self-contained file first.
- Return the JSON `url`, `expires_at`, and retention notice. Anonymous sites expire after 24 hours under provider policy; do not promise a custom TTL or immediate backup deletion. No viewing password is set; here.now's server-side passwords require an authenticated, claimed site.
- The script supplies generic display metadata. here.now documents AI processing of content excerpts for generated metadata and thumbnail rendering. Explicit metadata avoids generating those fields, but is not a blanket opt-out from content processing. This workflow does not encrypt the HTML. Respect existing confidentiality constraints.
- The private receipt contains a claim token and signed upload URLs and references an immutable HTML snapshot. Do not display it or upload it. Do not claim the site or use account credentials unless requested.
- The script verifies API readiness and byte-for-byte HTTP content, not browser layout. Check in a browser when needed, and state the verification actually performed.
- On failure, preserve the local HTML and private receipt. If the receipt has here.now deployment IDs, use `bash <skill-directory>/scripts/publish.sh --resume /absolute/path/to/receipt.json` to continue the same deployment. Finalize is idempotent; resume does not create a new site. Signed upload URLs expire after one hour; if expired, stop and inspect the documented upload-refresh flow rather than creating another site. Old Netlify receipts are not compatible.
- If creation had an ambiguous outcome without saved IDs, stop for investigation. On HTTP 429, stop and report the rate limit. Do not loop over new deployments, bypass limits, use existing login credentials, or silently switch providers.
- Use `--dry-run` to validate the input without uploading. It does not validate layout or noindex metadata.

API and privacy references: https://here.now/docs and https://here.now/privacy

Example: “Use html-artifact to explain this change to developers without prior context. Cover the motivation, before/after behavior, and a flow diagram if useful. Keep the page static.”
