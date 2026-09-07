# HTML Artifact for Codex

English | [中文](README.zh.md)

**Give Codex an artifact workflow: create a visual document, open it locally, and share it on request.**

This Agent Skill brings an artifact-style experience to Codex, similar to the artifact workflows available in Claude / Claude Code environments. It turns reports, explanations, comparisons, and case reviews into complete HTML pages and opens the saved file locally. Temporary online sharing is available when explicitly requested.

It is a community implementation, not a built-in Codex or Claude Code feature, and does not reproduce their native interfaces. In Claude Code, prefer an available built-in artifact capability when it meets the request. This skill primarily serves Codex and other environments.

No frontend build chain, Python, Node, hosting account, or provider CLI is required.

## What you get

- **Self-contained HTML** — inline CSS, optional JavaScript, and SVG; the saved file also works offline.
- **Readable documents** — responsive layouts, clear hierarchy, and print styles without React or a build step.
- **Concrete case reviews** — dialogue excerpts beside annotations, separating facts, inferences, proposed fixes, and acceptance criteria.
- **Local delivery by default** — saves the HTML and opens it with the system default application.
- **Sharing on request** — anonymous here.now publishing with a URL, expiry time, and retention notice.
- **Recoverable publishing** — continue the same deployment after an upload or status-check failure instead of creating another project.

Use it for reports, technical explanations, research summaries, comparisons, and review documents. Keep simple answers in chat; use a dedicated development workflow for production websites and full applications.

## Install in Codex

Check that the destination does not already exist, then run:

```bash
git clone https://github.com/pawaca/html-artifact.git ~/.codex/skills/html-artifact
```

If you use a custom `CODEX_HOME`, install into its `skills/html-artifact` subdirectory. Inspect local changes before updating an existing installation rather than overwriting it. Start a new Codex session after installation.

You can also ask Codex:

```text
Use skill-installer to install https://github.com/pawaca/html-artifact
```

## Use it

```text
Use html-artifact to turn this proposal into a visual document that nontechnical colleagues can review.
```

```text
Review these issues case by case. Quote the relevant dialogue, annotate what went wrong, and explain the fix and acceptance criteria.
```

```text
Create a single-file HTML document. Save it locally only; do not upload it.
```

**The default workflow stays local.** After generating and checking a page, the skill opens the file with the operating system's default application and returns its absolute file link. Say “do not open” or “only generate the file” to skip opening. Revisions keep the same file and prompt you to refresh rather than creating duplicate tabs. If opening fails or no desktop is available, the file is still delivered locally; nothing is uploaded as a fallback.

Upload only on an explicit request such as “upload this to here.now,” “give me a shareable web URL,” or “update the hosted version.” “Create an artifact,” “preview,” “open,” and ordinary edits remain local. A previous upload does not authorize future uploads unless you request ongoing synchronization. The skill does not routinely ask whether to upload or repeat an already answered approval question. Existing confidentiality and sharing constraints still apply. A built-in Claude Code artifact workflow uses its own delivery mechanism.

```text
Upload this completed HTML to here.now and give me a shareable web URL.
```

## Publishing script

For explicitly requested uploads only. Requires Bash 3.2+, curl 7.55+, jq, and one of `sha256sum`, `shasum`, or `openssl`. Use macOS, Linux, or a shell environment with these tools. Native PowerShell is not a target runtime.

```bash
# Validate the input without making network requests
bash scripts/publish.sh /absolute/path/to/index.html --dry-run

# Upload one HTML file
bash scripts/publish.sh /absolute/path/to/index.html

# Resume from a failure receipt without creating a new deployment
bash scripts/publish.sh --resume /absolute/path/to/receipt.json
```

On success, stdout contains JSON; progress and errors go to stderr. The JSON includes `url`, `expires_at`, `retention`, and verification status.

- Anonymous here.now sites expire after **24 hours** under provider policy. There is no custom anonymous TTL; expiry is not a guarantee about backup deletion.
- Sites have **no viewing password**; anyone with the URL can read them. The template and skill default to `noindex,nofollow`, which discourages search indexing but does not restrict access. Server-side passwords require claiming the site with an account.
- Only the specified file is uploaded, up to 10 MiB. Relative assets, raw datasets, and directories are not uploaded.
- Private HTML snapshots and recovery receipts stay in `~/.codex/artifacts/.here-now/`. Set `HTML_ARTIFACT_STATE_DIR` to override this. Receipts contain claim tokens and signed upload URLs; never publish or commit them. Old Netlify receipts are not compatible.
- No login configuration is read. On failure, retain the artifact; resume the same deployment when possible. On 429, stop. Do not automatically switch providers or create replacement sites. Signed upload URLs expire after one hour; expired URLs require the documented refresh flow, not another create.
- Generic display metadata is supplied explicitly. here.now documents AI metadata processing and thumbnail generation; explicit metadata is not a blanket opt-out from all processing. HTML is not encrypted. See [privacy](https://here.now/privacy).
- The script checks API readiness and exact HTTP content, not browser layout. See [API documentation](https://here.now/docs).

## Repository layout

```text
SKILL.md                Trigger, authoring, validation, and delivery rules
assets/base.html        Lightweight page skeleton
references/design.md    Document layout guidance
references/diagrams.md  Diagram guidance
scripts/publish.sh      curl publishing and recovery
tests/test-publish.sh   Offline publishing regression checks
```

This repository contains no real customer conversations, production data, publishing credentials, or historical case-review reports.

## Validation

```bash
bash -n scripts/publish.sh
bash tests/test-publish.sh
```

Tests replace curl with a mock. They do not upload files or create live projects. Coverage includes HTTPS URL fallback, failure recovery, avoiding duplicate creation during recovery, snapshot integrity, error stages, and credential-output protection.

## Documentation languages

English is the default documentation language. The README is also available in [Chinese](README.zh.md), with a language switch at the top of each version. Keep both versions aligned when changing installation, behavior, dependencies, or limitations. Skill instructions, technical references, and licensing notices are maintained in English.

## License and references

This project uses the [MIT License](LICENSE). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for external references and the scope of the license.

Using this skill does not grant republication rights to supplied articles, images, conversations, or other third-party material. It does not automatically make all generated page content MIT-licensed. Preserve the applicable licenses and attribution when copying third-party code or templates.

Codex, Claude, Claude Code, and here.now are named only to describe compatibility and references. This project is not affiliated with or endorsed by OpenAI, Anthropic, or here.now.
