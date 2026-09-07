#!/usr/bin/env bash
set -euo pipefail
project=$(cd "$(dirname "$0")/.." && pwd -P)
scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT
mkdir -p "$scratch/bin"
export HTML_ARTIFACT_STATE_DIR="$scratch/state"
export HOST_TEST_LOG="$scratch/requests"
export HOST_TEST_CASE=ready
export HOST_TEST_HTML="$scratch/served.html"
export PATH="$scratch/bin:$PATH"
cat > "$scratch/bin/curl" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
method='' url='' output='' body=''
while (( $# )); do
  case "$1" in
    --request) method=$2; shift 2 ;;
    --output) output=$2; shift 2 ;;
    --data-binary) body=${2#@}; shift 2 ;;
    --config) url=$(sed -n 's/^url = "\(.*\)"$/\1/p' "$2"); shift 2 ;;
    --header) [[ "$2" != Authorization:* ]] || exit 8; shift 2 ;;
    *) shift ;;
  esac
done
printf '%s %s\n' "$method" "$url" >> "$HOST_TEST_LOG"
case "$url" in
  https://here.now/api/v1/publish)
    if [[ "$HOST_TEST_CASE" == rate_limit ]]; then printf '{"retry_after":3600}' > "$output"; printf 429; exit 0; fi
    jq -e '.files|length==1' "$body" >/dev/null
    printf '{"anonymous":true,"slug":"fixture","siteUrl":"https://fixture.here.now/","claimToken":"fixture-secret","upload":{"versionId":"version1","uploads":[{"path":"index.html","method":"PUT","url":"https://fixture.r2.cloudflarestorage.com/file?signed=secret","headers":{"Content-Type":"text/html; charset=utf-8"}}],"finalizeUrl":"https://here.now/api/v1/publish/fixture/finalize"}}' > "$output"
    if [[ "$HOST_TEST_CASE" == invalid_url ]]; then
      jq '.upload.uploads[0].url="https://untrusted.example/upload"' "$output" > "$output.next"; mv "$output.next" "$output"
    fi
    ;;
  https://fixture.r2.cloudflarestorage.com/*)
    if [[ "$HOST_TEST_CASE" == fail_upload ]]; then printf '{}' > "$output"; printf 503; exit 0; fi
    cp "$body" "$HOST_TEST_HTML"; printf '{}' > "$output" ;;
  https://here.now/api/v1/publish/fixture/finalize)
    jq -e '.versionId=="version1"' "$body" >/dev/null
    if [[ "$HOST_TEST_CASE" == fail_finalize ]]; then printf '{}' > "$output"; printf 503; exit 0; fi
    printf '{"success":true,"siteUrl":"https://fixture.here.now/","publishStatus":{"ownership":"anonymous","state":"live","persistence":"expiring","expiresAt":"2026-09-08T10:00:00Z"}}' > "$output" ;;
  https://fixture.here.now/)
    if [[ "$HOST_TEST_CASE" == modified_html ]]; then printf modified > "$output"; else cp "$HOST_TEST_HTML" "$output"; fi ;;
  *) printf 'Unexpected mock request\n' >&2; exit 9 ;;
esac
printf 200
MOCK
chmod +x "$scratch/bin/curl"
printf '<!doctype html><head><meta name="robots" content="noindex,nofollow"><title>Mock artifact</title></head>' > "$scratch/input.html"
run() { bash "$project/scripts/publish.sh" "$@" > "$scratch/result.json" 2> "$scratch/stderr"; }
receipt_from_error() { sed -n 's/^Recovery receipt: \(.*\) (private; do not display)$/\1/p' "$scratch/stderr"; }
run "$scratch/input.html" --dry-run
[[ ! -e "$HOST_TEST_LOG" ]]
jq -e '.network_requests==0 and .provider=="here.now"' "$scratch/result.json" >/dev/null
run "$scratch/input.html"
jq -e '.url=="https://fixture.here.now/" and .status=="ready" and .expires_at=="2026-09-08T10:00:00Z" and (has("password")|not)' "$scratch/result.json" >/dev/null
! grep -Eq 'fixture-secret|signed=secret' "$scratch/result.json"
receipt=$(jq -r .receipt_path "$scratch/result.json")
if stat -f '%Lp' "$receipt" >/dev/null 2>&1; then mode=$(stat -f '%Lp' "$receipt"); else mode=$(stat -c '%a' "$receipt"); fi
[[ "$mode" == 600 ]]
for failure in fail_upload fail_finalize modified_html; do
  export HOST_TEST_CASE=$failure
  if run "$scratch/input.html"; then echo "Expected $failure" >&2; exit 1; fi
  receipt=$(receipt_from_error)
  before=$(wc -l < "$HOST_TEST_LOG")
  export HOST_TEST_CASE=ready
  run --resume "$receipt"
  tail -n +$((before + 1)) "$HOST_TEST_LOG" > "$scratch/resume-log"
  ! grep -qx 'POST https://here.now/api/v1/publish' "$scratch/resume-log"
  if [[ "$failure" != fail_upload ]]; then ! grep -q '^PUT ' "$scratch/resume-log"; fi
  if [[ "$failure" == modified_html ]]; then ! grep -q '^POST ' "$scratch/resume-log"; fi
done
printf changed > "$(dirname "$receipt")/index.html"
before=$(wc -l < "$HOST_TEST_LOG")
if run --resume "$receipt"; then exit 1; fi
grep -q 'Snapshot hash differs' "$scratch/stderr"
[[ "$(wc -l < "$HOST_TEST_LOG")" == "$before" ]]
for failure in invalid_url rate_limit; do
  export HOST_TEST_CASE=$failure
  before=$(wc -l < "$HOST_TEST_LOG")
  if run "$scratch/input.html"; then exit 1; fi
  (( $(wc -l < "$HOST_TEST_LOG") == before+1 ))
done
receipt=$(receipt_from_error)
before=$(wc -l < "$HOST_TEST_LOG")
if run --resume "$receipt"; then exit 1; fi
grep -q 'creation outcome needs investigation' "$scratch/stderr"
[[ "$(wc -l < "$HOST_TEST_LOG")" == "$before" ]]
printf 'PASS: anonymous publication, dry run, expiry, private receipt, recovery, exact-content verification, snapshot validation, URL restriction, 429 and ambiguous creation. No network requests.\n'
