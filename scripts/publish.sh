#!/usr/bin/env bash
# Anonymous single-file here.now publishing. Compatible with Bash 3.2+.
set -euo pipefail
set +x
umask 077
stage=input
receipt=''
work=''
fail() { printf '%s: %s\n' "$stage" "$1" >&2; exit 1; }
finish() {
  local rc=$?
  if (( rc != 0 )) && [[ -n "$receipt" ]]; then
    printf 'Recovery receipt: %s (private; do not display)\n' "$receipt" >&2
  fi
}
trap finish EXIT
for dependency in curl jq; do command -v "$dependency" >/dev/null || fail "Missing dependency: $dependency"; done
sha256() {
  if command -v sha256sum >/dev/null; then sha256sum < "$1" | awk '{print $1}'
  elif command -v shasum >/dev/null; then shasum -a 256 < "$1" | awk '{print $1}'
  elif command -v openssl >/dev/null; then openssl dgst -sha256 < "$1" | awk '{print $NF}'
  else fail 'Need sha256sum, shasum, or openssl'; fi
}
phase() {
  jq --arg phase "$1" '.phase=$phase' "$receipt" > "$work/receipt.next"
  mv "$work/receipt.next" "$receipt"
}
# No account credentials, redirects, or automatic mutation retries.
# Signed upload URLs stay in a private curl config rather than process arguments.
request() {
  local method=$1 url=$2 body=${3:-} type=${4:-application/json} status
  [[ "$url" != *$'\n'* && "$url" != *$'\r'* && "$url" != *'"'* && "$url" != *'\'* ]] || fail 'Invalid request URL'
  printf 'url = "%s"\n' "$url" > "$work/request.config"
  local args=(-q -sS --proto '=https' --connect-timeout 10 --max-time 30
    --request "$method" --output "$work/response.json" --write-out '%{http_code}'
    --header 'User-Agent: html-artifact/3' --config "$work/request.config")
  if [[ "$url" == https://here.now/* ]]; then args+=(--header 'X-HereNow-Client: codex/html-artifact'); fi
  if [[ -n "$body" ]]; then args+=(--header "Content-Type: $type" --data-binary "@$body"); fi
  status=$(curl "${args[@]}") || fail 'Network request failed; no new deployment was retried'
  if [[ "$status" == 429 ]]; then fail 'HTTP 429: rate limit reached; stop and wait before retrying. Response retained privately.'; fi
  [[ "$status" == 2[0-9][0-9] ]] || fail "HTTP $status; response retained privately"
}
dry=no
resume=no
input=''
while (( $# )); do
  case "$1" in
    --dry-run) dry=yes; shift ;;
    --resume) (( $# >= 2 )) || fail '--resume requires a receipt'; receipt=$2; resume=yes; shift 2 ;;
    -h|--help) printf 'Usage: bash publish.sh FILE.html [--dry-run]\n       bash publish.sh --resume RECEIPT.json\n'; exit 0 ;;
    -*) fail "Unknown option: $1" ;;
    *) [[ -z "$input" ]] || fail 'Only one HTML file is supported'; input=$1; shift ;;
  esac
done
if [[ "$resume" == yes ]]; then
  [[ -z "$input" && "$dry" == no ]] || fail '--resume cannot be combined with HTML or --dry-run'
  [[ -f "$receipt" && ! -L "$receipt" ]] || fail 'Receipt must be an existing regular file'
  work=$(cd "$(dirname "$receipt")" && pwd -P)
  receipt="$work/$(basename "$receipt")"
  input="$work/index.html"
  jq -e '.provider=="here.now" and (.deployment.slug|type=="string") and (.deployment.upload.versionId|type=="string")' "$receipt" >/dev/null || fail 'No saved here.now deployment IDs; creation outcome needs investigation. Do not create again.'
  [[ -f "$input" ]] || fail 'Missing saved HTML snapshot'
  digest=$(sha256 "$input")
  [[ "$digest" == "$(jq -r '.sha256' "$receipt")" ]] || fail 'Snapshot hash differs from receipt; stopped'
else
  [[ -f "$input" ]] || fail 'Provide an existing HTML file'
  case "$input" in *.html|*.htm) ;; *) fail 'Expected .html or .htm file';; esac
  input="$(cd "$(dirname "$input")" && pwd -P)/$(basename "$input")"
  bytes=$(wc -c < "$input" | tr -d ' ')
  (( bytes > 0 && bytes <= 10485760 )) || fail 'HTML must be nonempty and no larger than 10 MiB'
  digest=$(sha256 "$input")
  if [[ "$dry" == yes ]]; then
    jq -n --arg source "$input" --arg hash "$digest" --argjson bytes "$bytes" '{source:$source,uploaded_path:"/index.html",bytes:$bytes,sha256:$hash,network_requests:0,provider:"here.now"}'
    exit 0
  fi
  root=${HTML_ARTIFACT_STATE_DIR:-"$HOME/.codex/artifacts/.here-now"}
  mkdir -p "$root"
  work=$(mktemp -d "$root/site-XXXXXXXX")
  receipt="$work/receipt.json"
  cp "$input" "$work/index.html"
  input="$work/index.html"
  digest=$(sha256 "$input")
  bytes=$(wc -c < "$input" | tr -d ' ')
  jq -n --arg hash "$digest" '{provider:"here.now",phase:"creating",sha256:$hash,created_at:(now|floor)}' > "$receipt"
  jq -n --argjson bytes "$bytes" '{files:[{path:"index.html",size:$bytes,contentType:"text/html; charset=utf-8"}],displayName:"HTML artifact",displayDescription:"A temporary standalone HTML document."}' > "$work/payload.json"
  stage=create; printf 'Creating one temporary here.now site…\n' >&2
  request POST https://here.now/api/v1/publish "$work/payload.json"
  cp "$work/response.json" "$work/create-response.json"
  jq --slurpfile response "$work/response.json" '.deployment=$response[0] | .phase="upload"' "$receipt" > "$work/receipt.next"
  mv "$work/receipt.next" "$receipt"
fi
stage=contract
jq -e '.deployment | .anonymous==true and (.slug|type=="string" and test("^[a-z0-9-]+$")) and (.upload.versionId|type=="string" and test("^[A-Za-z0-9_-]+$"))' "$receipt" >/dev/null || fail 'Invalid anonymous deployment response; inspect the private receipt'
slug=$(jq -r .deployment.slug "$receipt")
url="https://$slug.here.now/"
finalize="https://here.now/api/v1/publish/$slug/finalize"
jq -e --arg url "$url" --arg finalize "$finalize" '.deployment | .siteUrl==$url and .upload.finalizeUrl==$finalize' "$receipt" >/dev/null || fail 'Unexpected site or finalize URL'
current=$(jq -r .phase "$receipt")
case "$current" in upload|finalize|ready) ;; *) fail 'Unknown recovery phase';; esac
if [[ "$current" == upload ]]; then
  jq -e '.deployment.upload.uploads | length==1 and (.[0] | .path=="index.html" and .method=="PUT" and (.url|test("^https://[a-zA-Z0-9-]+[.]r2[.]cloudflarestorage[.]com/")) and .headers=={"Content-Type":"text/html; charset=utf-8"})' "$receipt" >/dev/null || fail 'Unexpected upload contract; inspect the private response'
  upload=$(jq -r '.deployment.upload.uploads[0].url' "$receipt")
  stage=upload; printf 'Uploading the HTML snapshot…\n' >&2
  request PUT "$upload" "$input" 'text/html; charset=utf-8'
  phase finalize
fi
if [[ "$(jq -r .phase "$receipt")" == finalize ]]; then
  jq '{versionId:.deployment.upload.versionId}' "$receipt" > "$work/payload.json"
  stage=finalize; printf 'Finalizing the existing deployment…\n' >&2
  request POST "$finalize" "$work/payload.json"
  jq -e --arg url "$url" '.success==true and .siteUrl==$url and .publishStatus.ownership=="anonymous" and .publishStatus.state=="live" and .publishStatus.persistence=="expiring" and (.publishStatus.expiresAt|type=="string")' "$work/response.json" >/dev/null || fail 'API did not confirm a live anonymous expiring site'
  jq --slurpfile response "$work/response.json" '.result=$response[0] | .phase="ready"' "$receipt" > "$work/receipt.next"
  mv "$work/receipt.next" "$receipt"
fi
stage=verification; printf 'Verifying the published HTML…\n' >&2
request GET "$url"
cmp -s "$input" "$work/response.json" || fail 'Served HTML differs from the reviewed snapshot; inspect before sharing'
jq --arg url "$url" --arg receipt "$receipt" '{url:$url,provider:"here.now",status:"ready",expires_at:.result.publishStatus.expiresAt,receipt_path:$receipt,retention:"Anonymous sites expire after 24 hours under provider policy; no custom anonymous TTL or guarantee about backup deletion.",access:"Anyone with the URL can view; no password. noindex is not access control.",verification:"API readiness and byte-for-byte HTTP content verified; browser rendering not checked."}' "$receipt"
