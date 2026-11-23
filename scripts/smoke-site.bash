#! /usr/bin/env bash
# Checks a deployed copy of the site actually serves: both pages, and every script and stylesheet
# they load. Catches a wrong base path or a missing asset, which every test against the local
# build would miss. Usage: scripts/smoke-site.bash https://brandonapol.github.io/site-reliability-academy/

set -euo pipefail

base="${1:?usage: scripts/smoke-site.bash <site URL ending in />}"
base="${base%/}/"
failed=0

fetch() {
    # Pages can take a little while to serve a new deploy everywhere: retry before failing.
    curl --fail --silent --show-error --location --retry 5 --retry-delay 5 --retry-all-errors "$1"
}

for page in "" "play.html"; do
    url="${base}${page}"
    if ! html="$(fetch "${url}")"; then
        echo "smoke: ${url} did not load"
        failed=1
        continue
    fi
    if printf '%s' "${html}" | grep -qE 'src="[^"]*/src/[^"]*\.tsx?"'; then
        echo "smoke: ${url} is the unbuilt source page (it loads src/*.tsx), not the build."
        echo "       Check Settings → Pages → Source is \"GitHub Actions\", not a branch."
        failed=1
        continue
    fi
    assets="$(printf '%s' "${html}" | { grep -oE '(src|href)="[^"]+\.(js|css)"' || true; } | sed -E 's/^(src|href)="//; s/"$//' | sort -u)"
    if [[ -z "${assets}" ]]; then
        echo "smoke: ${url} loads no scripts or stylesheets; is this the built site?"
        failed=1
        continue
    fi
    while IFS= read -r asset; do
        case "${asset}" in
            http*) asset_url="${asset}" ;;
            /*) asset_url="$(printf '%s' "${base}" | grep -oE '^https?://[^/]+')${asset}" ;;
            *) asset_url="${base}${asset}" ;;
        esac
        if fetch "${asset_url}" >/dev/null; then
            echo "ok ${asset_url}"
        else
            echo "smoke: ${asset_url} (from ${url}) did not load"
            failed=1
        fi
    done <<<"${assets}"
done

exit "${failed}"
