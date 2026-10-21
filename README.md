# HTML Artifact for Codex

English | [中文](README.zh.md)

**Give the reader a useful visual answer. Open it locally. Share it when you choose.**

HTML Artifact is an agent skill for creating standalone HTML explanations, reports, comparisons, interactive explorations, small local tools, and UI designs on an OpenPencil canvas. It starts with what the reader needs to understand, decide, or do, then chooses the representation and interface.

There is no default document layout or shared visual shell. Prose, diagrams, comparisons, simulations, and controls can be combined around the task. Simple artifacts use native browser capabilities; complex ones may use modular source and bundled libraries. The deliverable remains one offline HTML file.

## What happens by default

1. Understand the subject, reader, and purpose of the page.
2. Choose the representation and visual direction from the task; use a small rendered experiment when an important choice remains uncertain.
3. Generate a complete HTML file with inline styles, graphics, and any useful scripts.
4. Verify the content, useful interactions, and whether the layout still conveys the right relationships on a narrow screen.
5. Save the file, open it with the system default application, and return an absolute file link.

**Nothing is uploaded unless you explicitly request online sharing.** Ordinary revisions edit the same local file and prompt you to refresh it. Say “do not open” or “only generate the file” to skip automatic opening. If opening fails or a desktop is unavailable, the agent returns the local file rather than uploading it as a workaround.

The skill primarily serves Codex and other environments without a suitable built-in artifact workflow. In Claude Code, an available built-in artifact capability takes priority unless you explicitly request this skill. This project does not reproduce either product's native interface.

## Install

For a new user-level installation, first check that the destination does not already exist:

```bash
git clone https://github.com/pawaca/html-artifact.git ~/.codex/skills/html-artifact
```

With a custom `CODEX_HOME`, use its `skills/html-artifact` directory instead. Start a new Codex session after installation. Inspect local changes before updating an existing installation.

Alternatively, ask Codex:

```text
Use skill-installer to install https://github.com/pawaca/html-artifact
```

## Try it

Explain a mechanism:

```text
Use html-artifact to explain this mechanism to someone new to the project.
Show the flow, and add a small interaction if changing one variable helps explain it.
```

Compare alternatives:

```text
Use html-artifact to compare these three approaches using the same criteria.
Recommend one and explain what would make you choose another.
```

Review concrete cases:

```text
Use html-artifact to review these issues case by case. Put the relevant dialogue
beside your analysis, then explain the fix and an observable acceptance criterion.
```

Revise or share afterward:

```text
Make the comparison easier to read on a phone.
```

```text
Upload this completed page to here.now and give me a shareable web URL.
```

“Create an artifact,” “preview,” “open,” and ordinary edits stay local. Upload authorization applies to the specified page and operation; a previous upload does not authorize future uploads unless you request ongoing synchronization. The agent need not ask about uploading after every local delivery or repeat an already granted approval.

## UI design canvas

For multiple screens, wireframes, or desktop/mobile variants in a Figma-like
workspace, the skill selects the UI canvas template. It reuses OpenPencil's scene
graph, Skia renderer, and Yoga layout. The canvas fills the page with compact
pan/zoom and fit controls; editor headers and side panels are omitted.

```text
Use html-artifact to design desktop and mobile screens for a reading app.
Place them on an OpenPencil canvas so I can compare layouts and inspect layers.
```

The authoring guide specifies the scene fields directly. The bundled product demo
is a maintenance fixture, not required reading or a visual starting point.

The agent authors `scene.json` and generates `index.html`; revisions update the
same JSON and regenerate. Readers open the HTML directly, without installing
OpenPencil, running a server, or connecting to the network. The UI consists of
design layers; use ordinary HTML when buttons and forms need to actually work.

```bash
python3 -m venv "$HOME/.cache/html-artifact/canvas-venv"
"$HOME/.cache/html-artifact/canvas-venv/bin/python" -m pip install -r scripts/canvas-requirements.txt
"$HOME/.cache/html-artifact/canvas-venv/bin/python" scripts/create-ui-canvas.py assets/ui-canvas/example.json \
  --output /absolute/path/to/preview/index.html
```

Generation uses Python 3.9+ with fontTools/Brotli; reuse the environment after
the initial setup. Fonts are automatically subset from the original bundled
faces on every revision, including newly added characters. If only the HTML
remains, `--extract-scene` recovers its editable JSON. Runtime code and fonts are
embedded; no companion files need uploading. The example is about **4.74 MB
(4.52 MiB)**, reduced from 8.75 MB; images may push
it past the anonymous publisher's 10 MiB limit. The canvas needs a recent browser
with JavaScript, WebAssembly, and WebGL. A content outline provides the
script-disabled and print fallback.

The template is an agent-authored, inspectable design canvas. It does not include
the complete app, manual drawing editor, collaboration, or `.fig` import/export.
See the [UI canvas guide](references/ui-canvas.md) for authoring, and the
[OpenPencil integration notes](references/open-pencil-integration.md) for component
analysis and maintenance.

## Design and output

- **One portable file.** Required assets and runtime code are embedded. No required external resources or development server. Reading artifacts retain their main explanation without scripts; interactive tools provide a meaningful static example or explain the script requirement.
- **Design matched to the task.** Choose what the reader should inspect or operate first, then give it the right prominence. There is no styled starter to copy, compulsory hero, or prescribed section sequence.
- **Visual choices with intent.** Develop composition, typography, surfaces, and color together. Resolve consequential uncertainty with a small rendered experiment; compare alternatives only when useful, keeping the essential task and content comparable. There is no palette catalog, theme rotation, required draft count, or process report. Clear briefs and routine revisions can proceed directly. Honor supplied branding and preserve useful choices on revision.
- **Structure that explains.** Use common criteria for comparisons, causal evidence for reviews, and dependencies and data flow for plans. Do not invent facts to fill a layout.
- **Purposeful graphics and interaction.** Diagrams reveal mechanisms; controls help readers explore a meaningful change without requiring them to ask for buttons. Static prose remains valid when it serves the task.
- **Reliable revisions.** Update calculations, labels, figures, examples, and static/print content together. Retain useful design choices while allowing changed requirements to reshape the page.
- **Readable across contexts.** Check meaningful states, keyboard access, and supported themes. A page can avoid overflow while a wrapped diagram misrepresents direction; inspect the relationship, not just the bounding box.

An explicit output location takes precedence. Otherwise, the agent infers its data directory from the active session, relevant environment variables, and host configuration, then saves to `<agent-data-directory>/artifacts/<topic>-<unique-suffix>/index.html`. For example, Codex uses its configured `CODEX_HOME` or `~/.codex`, while WorkBuddy uses its own data directory, typically `~/.workbuddy`. An unrelated agent directory merely existing does not select that host. If the host is unclear, use the current workspace's `artifacts/` directory. New artifacts get separate directories, while revisions keep the original path.

Use a normal chat answer for simple questions and a dedicated development workflow for production websites or full applications.

## Optional online sharing

Explicitly requested uploads use **here.now**, anonymously. The bundled script uploads only the reviewed HTML, confirms the site is live, and verifies that the served content matches the local snapshot byte for byte.

| Property | Behavior |
| --- | --- |
| Account | Not required; the script does not read login credentials |
| Lifetime | 24 hours under provider policy; no custom anonymous TTL |
| Access | Anyone with the URL can view; no viewing password |
| Size | Script accepts a single HTML file up to 10 MiB |
| Indexing | Authoring instructions and canvas output default to `noindex,nofollow` |
| Encryption | HTML is not encrypted by this workflow |

`noindex` is a crawler instruction, not access control. Server-side passwords require an authenticated, claimed site and are outside the bundled anonymous flow. Expiry does not establish when every backup is deleted.

here.now documents AI processing of content excerpts for generated metadata and thumbnail rendering. The script supplies generic display metadata explicitly, but that is not a blanket opt-out from all provider processing. Existing confidentiality and audience constraints still apply. See the provider's [privacy policy](https://here.now/privacy) and [API documentation](https://here.now/docs).

### Run the publisher directly

Publishing requires **Bash 3.2+, curl 7.55+, jq**, and one of **sha256sum, shasum, or openssl**. Python, Node, and a provider CLI are not required by the publisher. Local authoring does not require this upload toolchain; agents may use available browser tools for inspection. Native PowerShell is not a runtime for this Bash script.

Run these commands from the skill directory, or use the script's absolute path:

```bash
# Check file input without network requests; does not check layout or noindex
bash scripts/publish.sh /absolute/path/to/index.html --dry-run

# Create a new anonymous site from one HTML file
bash scripts/publish.sh /absolute/path/to/index.html

# Continue a failed deployment using its saved, unchanged snapshot
bash scripts/publish.sh --resume /absolute/path/to/receipt.json
```

Success is JSON on stdout, including `url`, `expires_at`, `retention`, `receipt_path`, and verification status. Progress and errors go to stderr.

**Recovery is not revision publishing.** Passing an HTML file creates a new site. `--resume` continues the existing deployment with its original snapshot; it does not upload your latest edits. The bundled script has no option to update an existing URL. A request to update that URL needs a separate, explicitly authorized use of the provider's update API.

### Failures and private state

Snapshots and receipts are stored in `.here-now/` beside the input HTML, following its output location. Override this with `HTML_ARTIFACT_STATE_DIR`; `--resume` uses the supplied receipt's directory. Receipts contain claim tokens and signed upload URLs; do not share or commit them.

- Keep the local HTML on failure. Resume the same deployment when valid IDs were saved.
- If creation is ambiguous and no IDs were saved, investigate before another attempt.
- On HTTP 429, stop and report the limit; do not loop over new sites or silently switch providers.
- Signed upload URLs expire after one hour. The script does not refresh them automatically; an expired URL needs the documented refresh flow before recovery can continue.

## Repository and validation

```text
SKILL.md                Task-first authoring, revision, and local delivery
references/composition.md  Choosing and combining representations
references/design.md    Visual direction, typography, responsive meaning
references/html.md      Portable HTML implementation and verification
references/publishing.md  Optional anonymous publishing workflow
assets/ui-canvas/       UI canvas template, example, runtime, and fonts
references/ui-canvas.md UI scene format and generation guide
scripts/create-ui-canvas.py  Single-file UI canvas generator
scripts/publish.sh      Anonymous here.now publishing and recovery
tests/test-publish.sh   Offline publisher regression checks
```

```bash
bash -n scripts/publish.sh
bash tests/test-publish.sh
```

Tests replace curl with a mock and create no live sites. They cover anonymous publication, dry runs, expiry output, private receipts, failure recovery, exact-content verification, snapshot integrity, URL restrictions, rate-limit stopping, and ambiguous creation. They do not validate generated page layouts or provider retention guarantees.

For skill behavior, give fresh agents realistic briefs without the suspected problem or intended
design, inspect their artifacts, and compare versions with blinded review.
Assess task quality and visual direction separately. For aesthetic changes,
repeat open briefs and compare across subjects to detect habitual styling;
also check explicit design constraints and revision consistency. Color changes
alone do not establish variety, and a single attractive sample does not
establish a reliable gain.

Canvas maintainers can run `npm ci && npm run build:canvas`, then
`CANVAS_PYTHON="$HOME/.cache/html-artifact/canvas-venv/bin/python" npm run test:canvas`.
This toolchain updates the runtime; normal generation does not need npm. Canvas
tests use installed Google Chrome (or `CHROME_PATH`) and verify real offline
rendering, Chinese glyph pixels, layout, selection, and navigation.

English and Chinese READMEs describe the same behavior and should be updated together. Skill instructions and technical references are maintained in English.

## License

The project uses the [MIT License](LICENSE). See [third-party references](THIRD_PARTY_NOTICES.md) for external references and license scope. User-supplied content and third-party material in generated pages retain their applicable rights and licenses.

This is a community project, not affiliated with or endorsed by OpenAI, Anthropic, or here.now.
