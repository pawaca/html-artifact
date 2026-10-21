# Temporary sharing

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
- Snapshots and receipts default to `.here-now/` beside the input HTML, following its chosen output location without assuming an agent host. Set `HTML_ARTIFACT_STATE_DIR` to use a different private state directory; `--resume` uses the supplied receipt's directory.
- The script verifies API readiness and byte-for-byte HTTP content, not browser layout. Check in a browser when needed, and state the verification actually performed.
- On failure, preserve the local HTML and private receipt. If the receipt has here.now deployment IDs, use `bash <skill-directory>/scripts/publish.sh --resume /absolute/path/to/receipt.json` to continue the same deployment. Finalize is idempotent; resume does not create a new site. Signed upload URLs expire after one hour; if expired, stop and inspect the documented upload-refresh flow rather than creating another site. Old Netlify receipts are not compatible.
- If creation had an ambiguous outcome without saved IDs, stop for investigation. On HTTP 429, stop and report the rate limit. Do not loop over new deployments, bypass limits, use existing login credentials, or silently switch providers.
- Use `--dry-run` to validate the input without uploading. It does not validate layout or noindex metadata.

API and privacy references: https://here.now/docs and https://here.now/privacy
