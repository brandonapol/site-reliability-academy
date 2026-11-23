SHELL := bash
.SHELLFLAGS = -e -c
.DEFAULT_GOAL := help
.ONESHELL:
.SILENT:

# .ONESHELL needs GNU Make 3.82+. macOS ships 3.81, where it is silently ignored and
# every recipe line runs in its own shell -- multi-line `if` blocks then die with
# "syntax error: unexpected end of file", which points nowhere near the real problem.
MIN_MAKE := 3.82
ifneq ($(firstword $(sort $(MAKE_VERSION) $(MIN_MAKE))),$(MIN_MAKE))
$(error GNU Make $(MAKE_VERSION) is too old; this Makefile needs $(MIN_MAKE)+. \
On macOS run `brew install make` and use `gmake`, or put \
"$$(brew --prefix)/opt/make/libexec/gnubin" first on PATH.)
endif

# Keep git's per-invocation environment out of recipes. When make runs from a git
# hook (see `make setup/hooks`), git exports GIT_DIR and friends pointing at this
# repository, and any tool that shells out to git then inspects the wrong state.
# check/fast passes GIT_INDEX_FILE back into its script on purpose:
# `git commit -- paths` points that variable at a temporary index.
unexport GIT_DIR
unexport GIT_INDEX_FILE
unexport GIT_WORK_TREE
unexport GIT_PREFIX

# The footer Claude Code appends to a pull request it opens, without its leading
# emoji so a line matches with or without it.
ATTRIBUTION_FOOTER := Generated with [Claude Code](https://claude.com/claude-code)

##@ Setup

.PHONY: setup
setup: node_modules setup/playwright setup/hooks ## Set up the development environment

.PHONY: setup/node
setup/node: ## Install and use the Node.js version from .nvmrc via nvm
	export NVM_DIR="$${NVM_DIR:-$$HOME/.nvm}"
	if [[ ! -s "$$NVM_DIR/nvm.sh" ]]; then
		echo "nvm is not installed. See https://github.com/nvm-sh/nvm#installing-and-updating"
		exit 1
	fi
	source "$$NVM_DIR/nvm.sh"
	nvm install
	nvm use

.PHONY: setup/playwright
setup/playwright: node_modules ## Install the Chromium build the e2e suite runs in
	npx playwright install chromium

.PHONY: setup/hooks
setup/hooks: ## Install git hooks
	ln -sf "$(CURDIR)/git/hooks/pre-commit" "$$(git rev-parse --git-path hooks)/pre-commit"
	ln -sf "$(CURDIR)/git/hooks/commit-msg" "$$(git rev-parse --git-path hooks)/commit-msg"
	echo "✅ Git hooks installed"

# The npm scripts run binaries from node_modules/.bin, which a fresh checkout does
# not have. Depending on the directory installs it on demand and reinstalls whenever
# the lockfile moves; touch keeps make from repeating the install on every target.
node_modules: package-lock.json
	npm ci
	touch node_modules

##@ Run

.PHONY: serve
serve: node_modules ## Run the dev server (academy at /, game at /play.html)
	npm run dev

.PHONY: serve/preview
serve/preview: build ## Serve the production build locally
	npm run preview

##@ Build

.PHONY: build
build: node_modules ## Type-check and build both pages into dist/
	npm run build

##@ Test

.PHONY: test
test: test/unit ## Run unit tests (not e2e)

.PHONY: test/unit
test/unit: node_modules ## Run the Vitest suites (engine, course, progress, UI)
	npm test

.PHONY: test/coverage
test/coverage: node_modules ## Run the unit tests with coverage; fails below the floor in vite.config.ts
	npx vitest run --coverage

.PHONY: test/e2e
test/e2e: node_modules ## Run the Playwright suite against a production build
	npm run e2e

.PHONY: test/check/fast
test/check/fast: node_modules ## Prove check/fast reads the index and names the fix
	./scripts/check-fast-test.bash

##@ Code quality

.PHONY: check
check: check/format check/lint check/types check/spelling check/audit check/workflows test/coverage ## The whole gate except e2e

# The pre-commit hook runs this and stops. CI runs the pieces of `check` above;
# this one only looks at what is staged. GIT_INDEX_FILE is unexported at the top
# of this file, and `git commit -- paths` points it at a temporary index, so pass
# it back through or the hook checks the wrong files.
.PHONY: check/fast
check/fast: node_modules ## Check staged files (prettier, cspell)
	index='$(subst ','\'',$(GIT_INDEX_FILE))'
	if [[ -n "$$index" ]]; then
		GIT_INDEX_FILE="$$index" ./scripts/check-fast.bash
	else
		./scripts/check-fast.bash
	fi

.PHONY: check/format
check/format: node_modules ## Check formatting (prettier)
	npm run format:check

.PHONY: check/lint
check/lint: node_modules ## Lint (eslint, including the engine's import boundary); warnings fail too
	npm run lint -- --max-warnings 0

.PHONY: check/types
check/types: node_modules ## Type-check every project
	npm run typecheck

.PHONY: check/audit
check/audit: node_modules ## Check the dependencies the site ships for known vulnerabilities
	npm audit --omit=dev --audit-level=moderate

# Pinned; bumped by hand (or Renovate, via the comment below).
# renovate: datasource=github-releases depName=rhysd/actionlint extractVersion=^v(?<version>.+)$
ACTIONLINT_VERSION := 1.7.12

.PHONY: check/workflows
check/workflows: ## Lint the GitHub Actions workflows (actionlint, with shellcheck on run: steps)
	if command -v actionlint >/dev/null 2>&1; then
		actionlint
	else
		docker run --rm -v "$(CURDIR):/repo" --workdir /repo rhysd/actionlint:$(ACTIONLINT_VERSION) -color
	fi

.PHONY: check/site
check/site: ## Check a deployed copy serves both pages and their assets (URL=https://…/)
	if [[ -z "$(URL)" ]]; then
		echo "Usage: make check/site URL=<site URL>"
		exit 1
	fi
	./scripts/smoke-site.bash "$(URL)"

.PHONY: check/spelling
check/spelling: node_modules ## Check spelling in code and docs
	npm run check:spelling

# Not part of `make check`: it needs a pull request number and the network. CI runs
# it in check-misc. The pull request is read fresh through gh rather than from the
# workflow's event payload, which a re-run would reuse unchanged.
.PHONY: check/attribution
check/attribution: ## Check a pull request carries no Claude Code attribution footer (PR=number)
	if [[ -z "$(PR)" ]]; then
		echo "Usage: make check/attribution PR=<pull request number>"
		exit 1
	fi
	if ! command -v gh >/dev/null 2>&1; then
		echo "gh is not installed. Install the GitHub CLI (https://cli.github.com), then run 'gh auth login'."
		exit 1
	fi
	# One line per line of the title, the description and each commit message,
	# labeled with where it came from, so a match says what to edit.
	if ! lines="$$(gh pr view "$(PR)" --json title,body,commits --jq '"title: " + .title, (.body | split("\n")[] | "description: " + .), (.commits[] | "commit \(.oid[0:8]): " + (.messageHeadline, (.messageBody | split("\n")[])))')"; then
		echo "Could not read pull request #$(PR). Check the number, and run 'gh auth login' (in CI, set GH_TOKEN)."
		exit 1
	fi
	if hits="$$(printf '%s\n' "$$lines" | tr -d '\r' | grep -F -- '$(ATTRIBUTION_FOOTER)')"; then
		echo "Pull request #$(PR) carries the Claude Code attribution footer:"
		echo ""
		printf '%s\n' "$$hits" | sed 's/^/  /'
		echo ""
		echo "Remove it: edit the pull request title or description, or amend the commit and push. Then re-run this check."
		exit 1
	fi

##@ Fix

.PHONY: fix
fix: fix/lint format ## Fix what can be fixed automatically

.PHONY: fix/lint
fix/lint: node_modules ## Apply eslint's automatic fixes
	npx eslint . --fix

.PHONY: format
format: node_modules ## Format code (prettier)
	npm run format

##@ Housekeeping

.PHONY: clean
clean: ## Remove build and test output
	rm -rf dist coverage playwright-report test-results node_modules/.vite

.PHONY: help
help: ## Displays help info
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z0-9_\/.-]+:.*?##/ { printf "  \033[36m%-24s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
