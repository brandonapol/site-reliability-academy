#! /usr/bin/env bash
# cspell:words ACMRT toplevel

# Fast checks for the pre-commit hook. `make check` stays the full gate that CI
# runs. This one only looks at what the commit will contain.

set -euo pipefail

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    cat <<'USAGE'
Usage: scripts/check-fast.bash

Checks the files staged in this repository, and nothing else:

  1. prettier --check, on each staged blob prettier knows how to format.
  2. cspell, on each staged blob, using this repo's cspell.json.

The blobs come from the index, so an unstaged edit is not what gets checked
and a staged file is still checked after the work tree copy changes.
Exits 0 when nothing is staged or every check passes. On failure, names the
fix: `make format` for formatting, or cspell.json for a word.

Run `make check/fast` to get the same. The pre-commit hook does.
USAGE
    exit 0
fi

SRA_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "${REPO_ROOT}" ]]; then
    echo "check/fast: not a git repository. Run it from a checkout."
    exit 1
fi
cd "${REPO_ROOT}"

PRETTIER="${SRA_ROOT}/node_modules/.bin/prettier"
CSPELL="${SRA_ROOT}/node_modules/.bin/cspell"

list="$(mktemp)"
work=""
cleanup() {
    rm -f "${list}"
    if [[ -n "${work}" ]]; then
        rm -rf "${work}"
    fi
}
trap cleanup EXIT

# git diff exits 1 when there are differences. That is a result, not an error.
diff_status=0
git diff --cached --name-only --diff-filter=ACMRT -z >"${list}" || diff_status=$?
if [[ "${diff_status}" -gt 1 ]]; then
    echo "check/fast: could not list staged files (git diff --cached exited ${diff_status})."
    exit 1
fi
if [[ ! -s "${list}" ]]; then
    echo "check/fast: nothing staged."
    exit 0
fi

# TMPDIR on macOS already ends in a slash. A second one makes the shadow path
# `T//check-fast...`, which then does not match the prefix we strip from output.
tmp="${TMPDIR:-/tmp}"
tmp="${tmp%/}"
work="$(mktemp -d "${tmp}/check-fast.XXXXXX")"
failed=0
count=0

while IFS= read -r -d '' path; do
    [[ -z "${path}" ]] && continue
    mode="$(git ls-files --stage -- "${path}" | awk 'NR==1 { print $1 }')"
    # A submodule pointer or a symlink has no source to format. cspell would
    # read the link text, which is a path, not words.
    case "${mode}" in
        160000 | 120000) continue ;;
    esac
    if [[ -z "${mode}" ]]; then
        echo "check/fast: ${path} is in the staged diff but not in the index."
        failed=1
        continue
    fi
    if ! git checkout-index --prefix="${work}/" -- "${path}"; then
        echo "check/fast: could not read the staged copy of ${path}."
        failed=1
        continue
    fi
    paths[${count}]="${path}"
    count=$((count + 1))
done <"${list}"

# prettier and cspell match their ignore files against the directory they run
# in. The shadow keeps the repo-relative paths and the repo's ignore files, so a
# staged blob is checked the same way `make check` checks the tree. A staged
# ignore file is already in the shadow, and its staged copy is the one to use.
# cspell resolves its ignorePaths against the config file's directory, so its
# config goes in the shadow too.
for ignore in .gitignore .prettierignore cspell.json; do
    if [[ -f "${SRA_ROOT}/${ignore}" && ! -e "${work}/${ignore}" ]]; then
        cp "${SRA_ROOT}/${ignore}" "${work}/${ignore}"
    fi
done

if [[ "${count}" -eq 0 ]]; then
    exit "${failed}"
fi

if [[ ! -x "${PRETTIER}" || ! -x "${CSPELL}" ]]; then
    echo "check/fast: prettier or cspell is not installed."
    echo "Fix: run 'npm ci' in the repo root (or 'make setup'), then commit again."
    exit 1
fi

prettier_status=0
prettier_out="$(
    cd "${work}"
    "${PRETTIER}" --config "${SRA_ROOT}/.prettierrc.json" --ignore-path .prettierignore \
        --ignore-unknown --list-different "${paths[@]}" 2>&1
)" || prettier_status=$?
if [[ "${prettier_status}" -ne 0 ]]; then
    echo "check/fast: these staged files are not prettier-clean:"
    printf '%s\n' "${prettier_out}" | sed 's/^/  /'
    echo "Fix: make format"
    while IFS= read -r line; do
        [[ -n "${line}" ]] && printf '     or: npx prettier --write %q\n' "${line}"
    done <<<"${prettier_out}"
    failed=1
fi

cspell_status=0
cspell_out="$(
    cd "${work}"
    "${CSPELL}" --config cspell.json --no-config-search --no-progress --no-summary \
        --no-must-find-files "${paths[@]}" 2>&1
)" || cspell_status=$?
if [[ "${cspell_status}" -ne 0 ]]; then
    echo "check/fast: cspell found a problem in a staged file."
    printf '%s\n' "${cspell_out}"
    echo "Fix: correct the spelling, or add the word to cspell.json."
    failed=1
fi

exit "${failed}"
