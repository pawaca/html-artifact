#!/usr/bin/env bash
# Anonymous single-file Netlify Drop publishing. Compatible with Bash 3.2+.
# SPDX-License-Identifier: MIT
# Protocol reference: netlify/cli drop-api.ts; see ../THIRD_PARTY_NOTICES.md.
set -euo pipefail
set +x
umask 077
api='https://api.netlify.com/api/v1'
stage='input'
receipt=''
work=''
fail() { printf '%s: %s\n' "$stage" "$1" >&2; exit 1; }
finish() {
  local rc=$?
  if [[ -n "$work" ]]; then rm -f "$work/headers" "$work/payload.json"; fi
  if (( rc != 0 )) && [[ -n "$receipt" ]]; then
    printf 'Recovery receipt: %s (private; do not display)\n' "$receipt" >&2
  fi
}
trap finish EXIT
for dependency in curl jq; do
  command -v "$dependency" >/dev/null || fail "Missing dependency: $dependency"
done
sha1() {
  if command -v sha1sum >/dev/null; then sha1sum < "$1" | awk '{print $1}'
  elif command -v shasum >/dev/null; then shasum -a 1 < "$1" | awk '{print $1}'
  elif command -v openssl >/dev/null; then openssl dgst -sha1 < "$1" | awk '{print $NF}'
  else fail 'Need sha1sum, shasum, or openssl'; fi
}
phase() {
  jq --arg phase "$1" '.phase=$phase' "$receipt" > "$work/receipt.next"
  mv "$work/receipt.next" "$receipt"
}
# No redirect following and no automatic mutation retries. Tokens stay out of argv.
request() {
  local method=$1 endpoint=$2 body=${3:-} authorized=${4:-no} status
  local args=(-sS --proto '=https' --connect-timeout 10 --max-time 30
    --request "$method" --output "$work/response.json" --write-out '%{http_code}'
    --header 'User-Agent: html-artifact/2' --header 'Referer: https://app.netlify.com')
  if [[ "$authorized" == yes ]]; then
    jq -er '.drop_token | select(type=="string" and test("^[A-Za-z0-9._~+/=-]+$")) | "Authorization: Bearer " + .' "$receipt" > "$work/headers" || fail 'Invalid upload token in receipt'
    args+=(--header "@$work/headers")
  fi
  if [[ -n "$body" ]]; then
    if [[ "$method" == PUT ]]; then args+=(--header 'Content-Type: application/octet-stream')
    else args+=(--header 'Content-Type: application/json'); fi
    args+=(--data-binary "@$body")
  fi
  status=$(curl "${args[@]}" "$api$endpoint") || fail 'Network request failed; no new deployment was retried'
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
  jq -e '.site_id | type=="string" and test("^[A-Za-z0-9_-]+$")' "$receipt" >/dev/null || fail 'No saved site ID; creation outcome needs investigation. Do not create again.'
  jq -e '.deploy_id | type=="string" and test("^[A-Za-z0-9_-]+$")' "$receipt" >/dev/null || fail 'No saved deployment ID; do not create again'
  [[ -f "$input" ]] || fail 'Missing saved HTML snapshot'
  digest=$(sha1 "$input")
  [[ "$digest" == "$(jq -r '.sha1' "$receipt")" ]] || fail 'Snapshot hash differs from receipt; stopped'
else
  [[ -f "$input" ]] || fail 'Provide an existing HTML file'
  case "$input" in *.html|*.htm) ;; *) fail 'Expected .html or .htm file';; esac
  input="$(cd "$(dirname "$input")" && pwd -P)/$(basename "$input")"
  bytes=$(wc -c < "$input" | tr -d ' ')
  (( bytes > 0 && bytes <= 10485760 )) || fail 'HTML must be nonempty and no larger than 10 MiB'
  digest=$(sha1 "$input")
  if [[ "$dry" == yes ]]; then
    jq -n --arg source "$input" --arg hash "$digest" --argjson bytes "$bytes" '{source:$source,uploaded_path:"/index.html",bytes:$bytes,sha1:$hash,network_requests:0}'
    exit 0
  fi
  root="${HTML_ARTIFACT_STATE_DIR:-$HOME/.codex/artifacts/.netlify-drop}"
  mkdir -p "$root"
  work=$(mktemp -d "$root/drop-XXXXXXXX")
  receipt="$work/receipt.json"
  cp "$input" "$work/index.html"
  input="$work/index.html"
  digest=$(sha1 "$input")
  jq -n --arg hash "$digest" '{phase:"token",sha1:$hash,created_at:(now|floor)}' > "$receipt"
  stage='token'; printf 'Getting anonymous upload token…\n' >&2
  request POST /drop/token
  jq -e '.token | type=="string" and length>0' "$work/response.json" >/dev/null || fail 'Missing token in response'
  jq --slurpfile response "$work/response.json" '.drop_token=$response[0].token | .phase="creating"' "$receipt" > "$work/receipt.next"
  mv "$work/receipt.next" "$receipt"
  jq '{files:{"/index.html":.sha1},token:.drop_token,created_via:"drop"}' "$receipt" > "$work/payload.json"
  stage='create'; printf 'Creating one temporary deployment…\n' >&2
  request POST /drop "$work/payload.json"
  cp "$work/response.json" "$work/create-response.json"
  jq -e '(.id|type=="string" and test("^[A-Za-z0-9_-]+$")) and (.deploy_id|type=="string" and test("^[A-Za-z0-9_-]+$"))' "$work/response.json" >/dev/null || fail 'Missing deployment IDs; creation response saved. Do not create again.'
  jq --slurpfile response "$work/response.json" '.site_id=$response[0].id | .deploy_id=$response[0].deploy_id | .required=$response[0].required | .phase="upload"' "$receipt" > "$work/receipt.next"
  mv "$work/receipt.next" "$receipt"
fi
site=$(jq -r '.site_id' "$receipt")
deploy=$(jq -r '.deploy_id' "$receipt")
stage='upload'
if [[ "$(jq -r '.phase' "$receipt")" == upload ]]; then
  jq -e --arg hash "$digest" '.required | type=="array" and all(.[]; .==$hash)' "$receipt" >/dev/null || fail 'Unexpected upload manifest'
  if [[ "$(jq '.required|length' "$receipt")" != 0 ]]; then
    printf 'Uploading the HTML snapshot…\n' >&2
    request PUT "/deploys/$deploy/files/index.html" "$input" yes
  fi
  phase polling
fi
stage='readiness'; printf 'Checking the existing deployment…\n' >&2
for (( attempt=0; attempt<20; attempt++ )); do
  request GET "/sites/$site/deploys/$deploy"
  state=$(jq -er '.state | select(type=="string")' "$work/response.json") || fail 'Missing state in response'
  [[ "$state" != error ]] || fail 'Provider reported deployment error; do not redeploy automatically'
  if [[ "$state" == ready ]]; then
    stage='URL'
    url=$(jq -er '[.ssl_url,.deploy_ssl_url,.url] | map(select(type=="string") | select(test("^https://[A-Za-z0-9-]+\\.netlify\\.app/?$"))) | .[0] // empty' "$work/response.json") || fail 'Ready, but no valid HTTPS URL; response saved for recovery'
    phase ready
    jq -n --arg url "$url" --arg site "$site" --arg deploy "$deploy" --arg receipt "$receipt" '{url:$url,password:"My-Drop-Site",status:"ready",site_id:$site,deploy_id:$deploy,receipt_path:$receipt,retention:"Unclaimed sites are removed after about one hour by Netlify; no custom TTL.",verification:"API readiness confirmed; browser rendering not checked."}'
    exit 0
  fi
  if (( attempt < 19 )); then sleep 2; fi
done
fail 'Not ready within polling window; resume this receipt instead of creating another deployment'
