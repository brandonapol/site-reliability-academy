#! /usr/bin/env bash
# cspell:words gpgsign recieve

# Proves scripts/check-fast.bash checks the index, ignores unstaged edits, and
# names the fix. A fixture git repo keeps the real checkout's index alone.

set -euo pipefail

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    cat <<'USAGE'
Usage: scripts/check-fast-test.bash

Runs scripts/check-fast.bash against a temporary git repo: a clean index
passes, an unformatted or misspelled staged blob fails and names the fix,
and the same defect left unstaged does not. Also checks the pre-commit hook
calls `make check/fast`, that `make help` lists the target, and that the
commit-msg hook rejects AI attribution.

Run `make test/check/fast` to get the same.
USAGE
    exit 0
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="${REPO_ROOT}/scripts/check-fast.bash"
HOOK="${REPO_ROOT}/git/hooks/pre-commit"
MSG_HOOK="${REPO_ROOT}/git/hooks/commit-msg"

for tool in prettier cspell; do
    if [[ ! -x "${REPO_ROOT}/node_modules/.bin/${tool}" ]]; then
        echo "check-fast-test: ${tool} is not installed. Run 'npm ci' (or 'make test/check/fast') first."
        exit 1
    fi
done

FIXTURE="$(mktemp -d "${TMPDIR:-/tmp}/check-fast-test.XXXXXX")"
trap 'rm -rf "${FIXTURE}"' EXIT

git -C "${FIXTURE}" init -q -b main
git -C "${FIXTURE}" config user.email "check-fast@example.com"
git -C "${FIXTURE}" config user.name "check-fast"
git -C "${FIXTURE}" config commit.gpgsign false

failures=0

# expect EXIT TEXT FORBIDDEN LABEL runs the check in the fixture.
expect() {
    local want_exit="$1" want_text="$2" forbid="$3" label="$4" out code=0
    out="$("${SCRIPT}" 2>&1)" || code=$?
    if [[ "${code}" -ne "${want_exit}" ]]; then
        echo "FAIL ${label}: exit ${code}, want ${want_exit}"
        printf '%s\n' "${out}" | sed 's/^/    /'
        failures=$((failures + 1))
        return
    fi
    if [[ -n "${want_text}" && "${out}" != *"${want_text}"* ]]; then
        echo "FAIL ${label}: output missing '${want_text}'"
        printf '%s\n' "${out}" | sed 's/^/    /'
        failures=$((failures + 1))
        return
    fi
    if [[ -n "${forbid}" && "${out}" == *"${forbid}"* ]]; then
        echo "FAIL ${label}: output unexpectedly contains '${forbid}'"
        printf '%s\n' "${out}" | sed 's/^/    /'
        failures=$((failures + 1))
        return
    fi
    echo "ok ${label}"
}

fresh() {
    cd "${FIXTURE}"
    git rm -rf --quiet --cached . >/dev/null 2>&1 || true
    find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
}

cd "${FIXTURE}"
expect 0 "nothing staged" "" "nothing staged"

fresh
mkdir -p "dir"
printf 'export const a = {b:1}\n' >"dir/spaced name.ts"
git add -- "dir/spaced name.ts"
expect 1 "make format" "" "unformatted staged ts file"
expect 1 "dir/spaced name.ts" "" "unformatted ts file is named"

fresh
printf "export const a = { b: 1 }\n" >good.ts
git add -- good.ts
printf 'export const c = {d:1}\n' >bad.ts
expect 0 "" "not prettier-clean" "unstaged ts file is ignored"

fresh
printf "export const a = { b: 1 }\n" >sample.ts
git add -- sample.ts
printf 'export const a = {b:1}\n' >sample.ts
expect 0 "" "not prettier-clean" "prettier reads the index, not the work tree"

fresh
printf 'export const a = "double"\n' >quotes.ts
git add -- quotes.ts
expect 1 "quotes.ts" "" "prettier uses the repo's config"

fresh
printf 'Please recieve this.\n' >note.txt
git add -- note.txt
printf 'Please receive this.\n' >note.txt
expect 1 "cspell.json" "" "cspell reads the index, not the work tree"

fresh
printf 'node_modules\n' >.gitignore
printf 'dist\n' >.prettierignore
git add -- .gitignore .prettierignore
expect 0 "" "could not read" "a staged ignore file is checked, not overwritten"

fresh
mkdir -p .vscode
printf 'Please recieve this.\n' >.vscode/notes.txt
git add -- .vscode/notes.txt
expect 0 "" "cspell found" "cspell honors the config's ignorePaths"

fresh
printf 'Hello from the fixture.\n' >note.txt
git add -- note.txt
expect 0 "" "cspell found" "staged spelling that is clean"

if grep -q '"\${MAKE}" check/fast' "${HOOK}"; then
    echo "ok hook runs check/fast"
else
    echo "FAIL hook does not run check/fast"
    failures=$((failures + 1))
fi
if grep -Eq '"\$\{MAKE\}" check([^/]|$)' "${HOOK}"; then
    echo "FAIL hook still runs the full check"
    failures=$((failures + 1))
else
    echo "ok hook does not run the full check"
fi

# msg_expect EXIT MESSAGE LABEL runs the commit-msg hook on MESSAGE.
msg_expect() {
    local want_exit="$1" message="$2" label="$3" code=0
    printf '%s\n' "${message}" >"${FIXTURE}/MSG"
    (cd "${FIXTURE}" && "${MSG_HOOK}" MSG >/dev/null 2>&1) || code=$?
    if [[ "${code}" -ne "${want_exit}" ]]; then
        echo "FAIL ${label}: exit ${code}, want ${want_exit}"
        failures=$((failures + 1))
    else
        echo "ok ${label}"
    fi
}
msg_expect 0 $'feat: add the lesson page\n\nPlain body.' "commit-msg accepts a plain message"
msg_expect 1 $'feat: x\n\nCo-Authored-By: Claude <noreply@anthropic.com>' "commit-msg rejects a Claude co-author"
msg_expect 1 $'feat: x\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)' "commit-msg rejects the footer"
msg_expect 0 $'feat: x\n\n# Co-Authored-By: Claude (a comment git strips)' "commit-msg ignores comment lines"

if command -v gmake >/dev/null 2>&1; then
    MAKE=gmake
else
    MAKE=make
fi
# Capture help instead of piping to grep -q. grep -q exits at the first match,
# make gets SIGPIPE, and pipefail then reports the pipeline as failed.
help_out="$("${MAKE}" -C "${REPO_ROOT}" help 2>&1)" || true
if [[ "${help_out}" == *"check/fast"* && "${help_out}" == *"test/check/fast"* ]]; then
    echo "ok make help lists check/fast"
else
    echo "FAIL make help does not list check/fast"
    failures=$((failures + 1))
fi

if [[ "${failures}" -ne 0 ]]; then
    echo "check-fast-test: ${failures} failed"
    exit 1
fi
echo "check-fast-test: all passed"
