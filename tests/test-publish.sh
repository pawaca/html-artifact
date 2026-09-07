#!/usr/bin/env bash
set -euo pipefail
project=$(cd "$(dirname "$0")/.." && pwd -P)
scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT
mkdir -p "$scratch/bin"
export HTML_ARTIFACT_STATE_DIR="$scratch/state"
export DROP_TEST_LOG="$scratch/requests"
export DROP_TEST_CASE=ready
export PATH="$scratch/bin:$PATH"
cat > "$scratch/bin/curl" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
method='' url='' output='' body='' headers=''
while (( $# )); do
  case "$1" in
    --request) method=$2; shift 2 ;;
    --output) output=$2; shift 2 ;;
    --data-binary) body=${2#@}; shift 2 ;;
    --header) if [[ "$2" == @* ]]; then headers=${2#@}; fi; shift 2 ;;
    https:*) url=$1; shift ;;
    *) shift ;;
  esac
done
printf '%s %s\n' "$method" "$url" >> "$DROP_TEST_LOG"
case "$url" in
  */drop/token) printf '{"token":"fixture-token"}' > "$output" ;;
  */drop)
    hash=$(jq -r '.files["/index.html"]' "$body")
    jq -n --arg hash "$hash" '{id:"fixture-site",deploy_id:"fixture-deploy",required:[$hash]}' > "$output"
    ;;
  */files/index.html)
    [[ "$(cat "$headers")" == 'Authorization: Bearer fixture-token' ]]
    if [[ "$DROP_TEST_CASE" == fail_upload ]]; then
      printf '{}' > "$output"; printf 503; exit 0
    fi
    printf '{}' > "$output"
    ;;
  */deploys/fixture-deploy)
    if [[ "$DROP_TEST_CASE" == invalid_url ]]; then
      printf '{"state":"ready","ssl_url":"https://untrusted.example/"}' > "$output"
    else
      printf '{"state":"ready","ssl_url":null,"url":"http://fixture.netlify.app","deploy_ssl_url":"https://deploy--fixture.netlify.app"}' > "$output"
    fi
    ;;
  *) printf 'Unexpected mock request\n' >&2; exit 9 ;;
esac
printf 200
MOCK
chmod +x "$scratch/bin/curl"
printf '<!doctype html><title>Mock artifact</title>' > "$scratch/input.html"
run() { bash "$project/scripts/publish.sh" "$@" > "$scratch/result.json" 2> "$scratch/stderr"; }
receipt_from_error() { sed -n 's/^Recovery receipt: \(.*\) (private; do not display)$/\1/p' "$scratch/stderr"; }

run "$scratch/input.html" --dry-run
[[ ! -e "$DROP_TEST_LOG" ]]
jq -e '.network_requests==0' "$scratch/result.json" >/dev/null
run "$scratch/input.html"
jq -e '.url=="https://deploy--fixture.netlify.app" and .status=="ready"' "$scratch/result.json" >/dev/null
! grep -q fixture-token "$scratch/result.json"
receipt=$(jq -r .receipt_path "$scratch/result.json")
[[ -f "$receipt" ]]
if stat -f '%Lp' "$receipt" >/dev/null 2>&1; then mode=$(stat -f '%Lp' "$receipt")
else mode=$(stat -c '%a' "$receipt"); fi
[[ "$mode" == 600 ]]

export DROP_TEST_CASE=fail_upload
if run "$scratch/input.html"; then printf 'Expected upload failure\n' >&2; exit 1; fi
grep -q 'upload: HTTP 503' "$scratch/stderr"
receipt=$(receipt_from_error)
[[ -f "$receipt" ]]
before=$(wc -l < "$DROP_TEST_LOG")
export DROP_TEST_CASE=ready
run --resume "$receipt"
tail -n +$((before + 1)) "$DROP_TEST_LOG" > "$scratch/resume-log"
! grep -q POST "$scratch/resume-log"
grep -q PUT "$scratch/resume-log"

# Resume must reject modified content before contacting any API.
printf changed > "$(dirname "$receipt")/index.html"
before=$(wc -l < "$DROP_TEST_LOG")
if run --resume "$receipt"; then printf 'Expected hash mismatch\n' >&2; exit 1; fi
grep -q 'Snapshot hash differs' "$scratch/stderr"
[[ "$(wc -l < "$DROP_TEST_LOG")" == "$before" ]]

export DROP_TEST_CASE=invalid_url
if run "$scratch/input.html"; then printf 'Expected URL rejection\n' >&2; exit 1; fi
grep -q 'no valid HTTPS URL' "$scratch/stderr"
receipt=$(receipt_from_error)
before=$(wc -l < "$DROP_TEST_LOG")
export DROP_TEST_CASE=ready
run --resume "$receipt"
tail -n +$((before + 1)) "$DROP_TEST_LOG" > "$scratch/resume-log"
! grep -Eq 'POST|PUT' "$scratch/resume-log"

# Ambiguous creation receipts must never create another deployment.
jq 'del(.site_id,.deploy_id)' "$receipt" > "$scratch/ambiguous.json"
before=$(wc -l < "$DROP_TEST_LOG")
if run --resume "$scratch/ambiguous.json"; then printf 'Expected missing-ID rejection\n' >&2; exit 1; fi
grep -q 'creation outcome needs investigation' "$scratch/stderr"
[[ "$(wc -l < "$DROP_TEST_LOG")" == "$before" ]]
printf 'PASS: dry run, HTTPS fallback, private receipt, token protection, same-deployment recovery, hash validation, URL rejection, ambiguous creation. No network requests.\n'
