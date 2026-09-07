# HTML Artifact for Codex

English | [中文](README.zh.md)

**Give Codex an artifact workflow: create a visual document, open it, and share it.**

This Agent Skill brings an artifact-style experience to Codex, similar to the artifact workflows available in Claude / Claude Code environments. It turns reports, explanations, comparisons, and case reviews into complete HTML pages and delivers a temporary link you can open immediately.

It is a community implementation, not a built-in Codex or Claude Code feature, and does not reproduce their native interfaces. In Claude Code, prefer an available built-in artifact capability when it meets the request. This skill primarily serves Codex and other environments.

No frontend build chain, Python, Node, hosting account, or Netlify CLI is required.

## What you get

- **Self-contained HTML** — inline CSS, optional JavaScript, and SVG; the saved file also works offline.
- **Readable documents** — responsive layouts, clear hierarchy, and print styles without React or a build step.
- **Concrete case reviews** — dialogue excerpts beside annotations, separating facts, inferences, proposed fixes, and acceptance criteria.
- **Temporary sharing by default** — anonymous Netlify Drop publishing with a URL, viewing password, and retention notice.
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

**The default workflow includes uploading.** This skill publishes the completed HTML to a third-party anonymous hosting service without requiring a separate publishing request. An explicit local-only instruction, a no-upload request, or an existing confidentiality or sharing constraint overrides that default. When a built-in Claude Code artifact workflow meets the request, use its delivery mechanism without an additional upload.

## Publishing script

Requires Bash 3.2+, curl 7.55+, jq, and one of `sha1sum`, `shasum`, or `openssl`. Use macOS, Linux, or a shell environment with these tools. Native PowerShell is not a target runtime.

```bash
# Validate the input without making network requests
bash scripts/publish.sh /absolute/path/to/index.html --dry-run

# Upload one HTML file
bash scripts/publish.sh /absolute/path/to/index.html

# Resume from a failure receipt without creating a new deployment
bash scripts/publish.sh --resume /absolute/path/to/receipt.json
```

On success, stdout contains JSON; progress and errors go to stderr. The JSON includes `url`, `password`, `retention`, and verification status.

- Netlify retains unclaimed deployments for about **one hour**. There is no custom expiration setting; retention is controlled by the provider.
- The viewing password, `My-Drop-Site`, is a shared service default and **must not be treated as private access control**. Do not use it to share material that cannot be public.
- Only the specified file is uploaded, up to 10 MiB. Relative images, attachments, raw datasets, and entire directories are not uploaded.
- HTML snapshots and recovery receipts containing tokens stay in `~/.codex/artifacts/.netlify-drop/`. Set `HTML_ARTIFACT_STATE_DIR` to choose another location. Do not publish these receipts or commit them to Git.
- No project claim or login is required. If the API fails, keep the local HTML; do not automatically switch to Sites, another provider, or an authenticated deployment.
- The anonymous endpoints follow Netlify CLI's implementation and may change. Deployment readiness does not imply browser visual verification.

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

This project uses the [MIT License](LICENSE). The publishing flow references Netlify CLI's anonymous Drop protocol implementation and retains its MIT notice. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the HTML example references and provenance boundaries.

Using this skill does not grant republication rights to supplied articles, images, conversations, or other third-party material. It does not automatically make all generated page content MIT-licensed. Preserve the applicable licenses and attribution when copying third-party code or templates.

Codex, Claude, Claude Code, and Netlify are named only to describe compatibility and references. This project is not affiliated with or endorsed by OpenAI, Anthropic, or Netlify.
