# Site Reliability Academy

A free, self-paced course in Site Reliability Engineering, in two tracks:

- **Practitioner:** 28 weeks for new grads and engineers who haven't done SRE. It starts in the
  browser, moves to a local cluster, and ends in the learner's own cloud account.
- **Reliability for Everyone:** 9 short browser modules for product owners, managers, support,
  sales and business. Nothing is ever typed.

[`docs/curriculum.md`](./docs/curriculum.md) is the spec: what each phase and module teaches,
where it runs and what the learner produces. Work is tracked in
[issues](https://github.com/brandonapol/site-reliability-academy/issues), one epic per area.

**Live site:** https://brandonapol.github.io/site-reliability-academy/ (deployed from `main` by
`.github/workflows/ci.yml` once every check passes). To add a lesson, see
[`docs/authoring.md`](./docs/authoring.md).

Phase 1 is [feauxbernetes](https://github.com/brandonapol/feauxbernetes), the in-browser game
about a first week on Inkwell's platform team. It was merged into this repository with its
history. Its design notes are in
[`docs/feauxbernetes-planning.md`](./docs/feauxbernetes-planning.md). Code comments that say
"planning.md" mean that file.

## Running it

```sh
make setup   # npm ci, Playwright's Chromium, and the git hooks
make serve   # Vite dev server
```

GNU make is required (on macOS, `brew install make` and use `gmake`). CI uses **Node 24**, set in
`.nvmrc` (`make setup/node`, or `nvm use`). The academy is `index.html` and the game is
`play.html`. Add `?fast=1` to the game's URL to shrink every scripted delay a hundredfold (the E2E
tests do).

Builds use the base path `/site-reliability-academy/`. To host the site somewhere else, set
`BASE_PATH` (`BASE_PATH=/ make build`). Routes live in the URL hash, so deep links work on any
static host.

`make help` lists every target. These are the ones that matter day to day:

| Target            | What it does                                              |
| ----------------- | --------------------------------------------------------- |
| `make serve`      | Vite dev server                                           |
| `make build`      | Type-check and build to `dist/`                           |
| `make check`      | The gate: Prettier, ESLint, types, spelling, unit tests   |
| `make check/fast` | Prettier and cspell on staged files (the pre-commit hook) |
| `make test/unit`  | Vitest once (engine in Node, UI in jsdom)                 |
| `make test/e2e`   | Playwright playthrough against the build                  |
| `make fix`        | ESLint autofix, then Prettier                             |

Contributing: see [`CONTRIBUTING.md`](./CONTRIBUTING.md). Coding agents read
[`AGENTS.md`](./AGENTS.md).

## How the code is laid out

```
src/course                     the course as data: tracks, phases, units, lessons
src/progress                   course progress, in the browser, keyed by lesson ID
src/academy                    the academy pages: landing, course map, lessons, progress
src/play                       the game page's lesson bar and start logic
packages/engine/{cluster,gitops,ci,telemetry,incident,story,testlab}
                               @sra/engine, the simulation: pure TypeScript, no React,
                               no DOM. Imported by subpath (@sra/engine/game)
src/content                    the game world: chapters, characters, glossary, docs links
src/store                      Zustand store, clock, persistence
src/features/*                 the game's UI panels (Flack, GitNub, Argh CD, Ops Console, …)
e2e/                           Playwright specs
```

`packages/engine` may not import React, Zustand or anything under `src/`. `src/content` may not
import React, or anything from `src/features` or `src/store`. Lint rules enforce both, so the
simulation can be tested without a browser.
