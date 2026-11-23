# Week 5 missions: design note

The Linux and Git missions for issue #23. They are built in #24 (simulated-shell missions), #25
(process, port, disk and signal missions on `v86`) and #26 (Git missions), on the mission interface
that #3 lists and this note proposes.

Phase 2's culture thread is **curiosity over procedure** (spec section 6): exercises can't be solved
from a checklist. Every mission below is built so that the habit a learner might paste in (delete
the biggest file, kill whatever is on the port, `git reset --hard`) either fails the goal or isn't
enough. The goal checks only the end state, so any correct approach passes.

## Where it sits

Week 5 is Practitioner-only (Phase 2 isn't shared with Reliability for Everyone), so the
feauxbernetes rule that the learner never types a command doesn't apply here. Typing commands is
the point. The world, characters and tone are still Inkwell's (`docs/feauxbernetes-planning.md`):
each mission opens with a Flack message or a PagerDoody page, never with a description of the
fault, and nothing is ever failed.

**Host: the lesson page**, like the nines game, with a new `LessonDo` kind (see "Lessons"). The
terminal needs no game clock, Flack or tabs, and the lesson page already writes course progress.

## The missions

Twelve missions in four lessons, from a first `ls` to a real on-call situation. **Runtime** is
`shell` for `just-bash` (files, text, logs) or `linux` for `v86` running Alpine (processes, ports,
disk, signals, limits and Git), the spec's split (section 3, Tier 0). Names, values, and which
candidate is the real culprit come from the mission seed, so the answer differs between learners
and is repeatable for one.

### Lesson 1, `linux-files-and-logs` (shell)

**1. `config-hunt`: find the real config.**

- **Situation.** Kai in Flack: "Billing's config moved in the reorg and nobody wrote down where.
  Can you put a copy in `~/handoff/` so the night shift has it?"
- **Seed.** A tree under `/srv` and `/etc/inkwell` with the live `billing.conf` and three decoys: a
  `billing.conf.bak` and `billing.conf.old` with stale values, and a `billing.conf` under a
  `staging/` directory. The live one is the path named in `/etc/inkwell/services/billing`. Directory
  names are seeded.
- **Goal.** `~/handoff/billing.conf` exists and its content equals the live config byte for byte.
- **Teaches.** `pwd`, `ls`, `cd`, `cat`, `find`, `mkdir`, `cp`.
- **Why a recipe fails.** `find / -name billing.conf` returns two hits and the backups look
  plausible. The learner has to read the service file to know which is live.
- **Hints.** 1: "Four files look like billing's config. Which one does the service actually read?"
  2: "`/etc/inkwell/services/` says which file each service loads. `cat` it."

**2. `log-what-broke`: what went wrong at 14:00.**

- **Situation.** Taylor: "Customers say checkout failed for a while after two o'clock. It's fine
  now. What happened?" Morgan adds: "Put the error code in the incident notes,
  `/srv/incidents/INC-<n>/notes.txt`."
- **Seed.** A day of `billing` logs, rotated: `billing.log`, `billing.log.1` and
  `billing.log.2.gz`, with the window split across the plain and compressed files. Two error codes:
  a harmless retry warning that appears all day (the most frequent error overall) and the real one,
  which only appears in a seeded 15–25-minute window. Codes and window are seeded.
- **Goal.** The notes file contains the real error code as a whole word, and doesn't contain the
  all-day warning's code.
- **Teaches.** `grep`, `zcat`, `sort | uniq -c | sort -n`, `head`, `tail`, reading timestamps.
- **Why a recipe fails.** "Count errors, take the top one" picks the all-day warning. The answer is
  the error whose rate changed in the window, not the most common error.
- **Hints.** 1: "Which errors are new around two o'clock, not just common?" 2: "Part of the
  afternoon is in the compressed file. `zcat` reads it; pipe it to `grep`."

**3. `log-one-request`: follow one checkout.**

- **Situation.** Taylor forwards a complaint: "Account `<id>` says they were charged but got an
  error page." Morgan: "Find which service failed their request. Same notes file."
- **Seed.** Logs for `web`, `billing` and `payments`, with request IDs on every line. The
  account's failing request passes through `web` and `billing` and fails in `payments`; the same
  account has two successful requests that day. Account ID, request ID and failing service are
  seeded.
- **Goal.** The notes file contains the failing request's ID and the failing service's name.
- **Teaches.** `grep -r`, extracting a field with `awk` or `cut`, following an ID across files.
  This is the habit week 8 and week 15 build on.
- **Why a recipe fails.** Grepping the account ID finds three requests. Only one failed, and
  `web` logs it as a 502 without the cause; the cause is two hops away.
- **Hints.** 1: "The account has more than one request. Which one failed, and what's its request
  ID?" 2: "Every service logs the same request ID. `grep -r` that ID across `/var/log`."

**4. `config-bad-line`: fix the one bad line.**

- **Situation.** PagerDoody: `web` error rate high since this morning's deploy. Kai: "The deploy
  changed `web.conf`. Last night's copy is in `/srv/backup/`. Put back whatever broke it, but keep
  the version bump, we need that."
- **Seed.** The live `web.conf` differs from the backup in two lines: an intended `version` bump and
  a bad `db_host` (a seeded typo). Neither the key nor the typo is the same between seeds.
- **Goal.** The live file's `db_host` equals the backup's, its `version` equals the new value, and
  every other line is unchanged.
- **Teaches.** `diff`, `grep`, `sed -i` (the simulated shell has no editor; see open questions).
- **Why a recipe fails.** Copying the backup over the live file reverts the version bump too.
- **Hints.** 1: "How many lines changed? Which one did the deploy mean to change?" 2: "`diff`
  shows both lines. `sed -i 's/old/new/' file` changes one."

### Lesson 2, `linux-disk-full` (linux)

This is one of the two missions the spec names.

**5. `disk-full`: find what's eating the disk.**

- **Situation.** PagerDoody: `/var/log` on the log box at 100%, billing can't write its log.
- **Seed.** A 32 MB tmpfs at `/var/log` (small and fixed, so `df` behaves the same in every run).
  Candidates: the live `billing.log` (large, open by the running `billing`), an uncompressed
  rotated `billing.log.1`, a forgotten `heapdump-<n>.hprof` under `web/`, and many small `.gz`
  archives. Whether the heap dump or the rotated log is biggest is seeded.
- **Goal.** At least 25% of `/var/log` is free; `billing` is running; `billing.log` exists and is
  the same inode `billing` has open (it wasn't deleted and recreated).
- **Teaches.** `df -h`, `du -sh * | sort -h`, `ls -lS`, `find -size`, `gzip`.
- **Why a recipe fails.** The biggest file is sometimes the live log. Deleting it fails the goal
  (and frees nothing while `billing` holds it open; mission 6 is about exactly that). "Delete the
  biggest" isn't safe, and freeing enough space can take more than one file.
- **Hints.** 1: "Which directory under `/var/log` holds the space? Which of its files are still in
  use?" 2: "`du -sh /var/log/* | sort -h` ranks them. A rotated log nobody writes to can be
  compressed or removed; the live one can't."

**6. `disk-still-full`: the space didn't come back.**

- **Situation.** Alex in Flack: "I deleted web's huge debug log an hour ago, but `df` still says
  97%. Did I break the disk?" (Blameless: Alex did a reasonable thing, and the lesson is why it
  didn't work.)
- **Seed.** The same tmpfs. `web` holds a deleted debug log open and keeps writing to it. `du`
  shows a mostly empty directory while `df` shows the disk nearly full. The fd number and file name
  are seeded.
- **Goal.** At least 25% free; a `web` process is running and its log file exists on disk.
- **Teaches.** Why `df` and `du` disagree, `lsof +L1` or `ls -l /proc/<pid>/fd`, truncating
  through `/proc/<pid>/fd/<n>`, or restarting `web` with `rc-service`. Either way passes.
- **Why a recipe fails.** No file to delete. Every `du`-based habit finds nothing.
- **Hints.** 1: "`du` adds up files that have names. `df` counts space in use. What uses space
  without a name?" 2: "A deleted file stays on disk while a process has it open. `lsof +L1` lists
  them."

### Lesson 3, `linux-processes` (linux)

**7. `port-taken`: who's holding the port.** This is the spec's second named mission.

- **Situation.** Alex: "New search release won't start: `address already in use` on 8080. Can you
  get it running?"
- **Seed.** Port 8080 is held by one of three seeded culprits: yesterday's `search` release still
  running from its old directory, a `socat` forward left over from a debugging session, or a test
  fixture `nc -lk`. Decoys listen on 8000 (the admin page) and 18080.
- **Goal.** The process listening on 8080 was started from `/srv/search/current`; the decoys on
  8000 and 18080 are still listening.
- **Teaches.** `ss -ltnp` (or `netstat`, `lsof -i`, `fuser`), `ps`, `kill`, `rc-service`.
- **Why a recipe fails.** The holder isn't always called `search`. `pkill search` sometimes kills
  nothing and sometimes kills the wrong thing; `fuser -k` on the wrong port kills the admin page.
- **Hints.** 1: "Something already has 8080. Which process, and is it one we want?" 2: "`ss -ltnp`
  shows the process behind each listening port."

**8. `reload-without-restart`: pick up the config, mid-sale.**

- **Situation.** Morgan: "We raised web's rate limit in `/etc/inkwell/web.conf` for the sale. Get
  web to use it, but don't restart it: a restart drops everyone's cart."
- **Seed.** `web` is a master process and two workers. The master re-reads its config on `SIGHUP`
  and writes what it loaded to `/run/web/active.conf`. The pidfile `/run/web.pid` is stale and
  points at a PID now used by the nightly `backup` job. PIDs are whatever the snapshot has; the
  stale pidfile is set by the seed.
- **Goal.** `/run/web/active.conf` shows the new limit; the web master's PID is the one it had at
  seed time; `backup` is still running.
- **Teaches.** Signals (`HUP`, `TERM`, `KILL`), `kill -l`, `pgrep -a`, `ps -o pid,ppid,args`,
  process trees.
- **Why a recipe fails.** `kill -HUP $(cat /run/web.pid)` hangs up the backup job, which dies. A
  restart loads the new limit but changes the PID, which the goal reports as "carts dropped".
- **Hints.** 1: "Which process is web's master? Is the pidfile telling the truth?" 2: "`ps -o
pid,ppid,args` shows parents. `SIGHUP` asks this program to re-read its config."

**9. `runaway-job`: the box is slow.**

- **Situation.** PagerDoody: load on the batch box above 6 for 20 minutes.
- **Seed.** A `report` job stuck in a loop, started every minute by `crond`, and the nightly
  `backup`, which also uses a lot of CPU and is legitimate. Job names are seeded.
- **Goal.** No `report` process running; the `report` crontab line is disabled or removed; `backup`
  is running.
- **Teaches.** `top`, `ps aux --sort=-%cpu`, `kill`, parent PIDs, `crontab -l`, `crontab -e` or
  editing the crontab file.
- **Why a recipe fails.** The top CPU user is sometimes `backup`. Killing `report` works for a
  minute, then `crond` starts another.
- **Hints.** 1: "You killed it and it came back. What starts it?" 2: "A process's parent PID says
  who started it. `crontab -l` lists what runs on a schedule."

**10. `too-many-open-files`: billing hits a limit.**

- **Situation.** Taylor: "Checkout errors again." Billing's log says `Too many open files`.
- **Seed.** `billing` runs with a soft `nofile` limit of 64, set in `/etc/conf.d/billing`, and
  leaks a file descriptor every few seconds, so it fails a while after each start. Limit and leak
  rate are seeded.
- **Goal.** The running `billing`'s soft `nofile` limit (from `/proc/<pid>/limits`) is at least
  1024, and `/etc/conf.d/billing` sets at least 1024, so the next restart keeps it.
- **Teaches.** `ulimit`, `/proc/<pid>/limits`, `ls /proc/<pid>/fd | wc -l`, service config.
- **Why a recipe fails.** `ulimit -n 4096` in the learner's own shell changes nothing for
  `billing`. Restarting fixes it for a few minutes. The lesson's Check asks why raising the limit
  is mitigation and the leak still needs a ticket.
- **Hints.** 1: "Limits belong to a process. What are `billing`'s, not your shell's?" 2:
  "`/proc/<pid>/limits` shows them. The service's own config sets them at start."

### Lesson 4, `git-what-changed` (linux)

Both Git missions run in the `v86` image. Each has a working repository and a bare `origin` on the
same box, so "shipped" means "pushed to `origin`".

**11. `git-what-changed`: find the change and revert it.**

- **Situation.** PagerDoody: checkout latency up since about 10:40. Morgan: "What changed?"
- **Seed.** `/srv/inkwell-config`, about 30 commits over a week by several authors. At a seeded
  time before the page, a commit titled "tidy billing config" reformats a file and also lowers
  `billing`'s upstream timeout. A later commit touches a comment in the same file; another, after
  that, turns on a feature flag that must stay.
- **Goal.** On `origin`'s `main`: the timeout has its old value; the feature flag is still on; the
  previous `origin/main` tip is an ancestor of the new one (history wasn't rewritten).
- **Teaches.** `git log --since`, `git log -p`, `git log -S`, `git show`, `git blame`,
  `git revert`, `git push`. The lesson text links forward to week 14's "what changed?".
- **Why a recipe fails.** The commit message doesn't say what it did, and the last commit to touch
  the file is the harmless one. `git reset --hard HEAD~2` loses the feature flag and can't be
  pushed without `--force`, which fails the ancestry part.
- **Hints.** 1: "What changed shortly before 10:40, and in which file?" 2: "`git log -p --since`
  shows each commit's diff. `git revert <commit>` undoes one commit and keeps the rest."

**12. `git-lost-work`: get Alex's afternoon back.**

- **Situation.** Alex: "I ran `git reset --hard` on my `rate-limiter` branch and lost the
  afternoon. Is it gone?"
- **Seed.** In `/srv/work/web`, `rate-limiter` was reset three commits back. The lost commits are
  only in the reflog, along with an earlier reset of a different experiment; a stash holds
  unrelated changes. Commit times and messages are seeded.
- **Goal.** The lost tip commit is an ancestor of `rate-limiter` (or `rate-limiter`'s tree has the
  same content); `main` is unchanged.
- **Teaches.** `git reflog`, `git log -g`, `git branch -f` or `git reset --hard <commit>`,
  `git cherry-pick`.
- **Why a recipe fails.** `git stash pop` brings back the wrong work. The reflog has two resets;
  the right entry is told apart by time and message, not position.
- **Hints.** 1: "Commits you reset away aren't deleted straight away. Where does Git remember where
  a branch used to point?" 2: "`git reflog rate-limiter` lists where the branch has been."

### Not included, and why

`git bisect` (finding the first bad commit with a test script) fits on-call less than "what
changed?" and adds a 13th mission; it's a candidate for page of the day. File permissions and users
are left out of the simulated shell because `just-bash` has no users to enforce them against.

## Goal checking

**A goal is a predicate over observed state, never over commands typed.** A mission declares the
state it needs as **probes**; the runtime answers them with plain data; the goal is a pure function
of the seed and that data. It lives in the engine and is tested without a DOM or a runtime.

A goal returns its parts, not just pass or fail, so the panel can say which part is still unmet and
why ("Space freed: yes. `billing.log` intact: no, `billing` is writing to a deleted file"), which
is the style guide's "say why" for a terminal.

**When it runs.** After every command for `shell` (reading the in-memory filesystem costs
microseconds). For `linux`, when the learner presses Enter and the terminal has been quiet for a
second, and on a Check button. The trigger is the learner's Enter; what's checked is state.

### How each runtime exposes state

- **`shell`:** `just-bash`'s `Bash` exposes its filesystem as `bash.fs` (`IFileSystem`:
  `readFile`, `stat`, `readdir`, `exists`). Probes read it directly and never run a command, so
  checking doesn't touch the learner's shell or history.
- **`linux`:** a guest agent on the second serial port. **Recommended over marker files on 9p.**

The guest agent is a small BusyBox shell script, `/sbin/sra-agent`, started by `inittab` on
`ttyS1` with `respawn`. `v86` has the port: its `uart1` option creates a second UART at `0x2F8`,
and `serial_send_bytes(1, …)` and the `serial1-output-byte` event carry the bytes (both in
`src/browser/starter.js`). The learner's terminal stays on `ttyS0`. The agent reads one request per
line (`<id> <probe> <args>`), runs a fixed collector for that probe kind (`stat`, `df`,
`/proc/<pid>/{stat,cmdline,limits,fd}`, `ss -ltnp`, `crontab -l`, `git rev-parse`,
`git merge-base --is-ancestor`, `git show <ref>:<path>`), and writes lines framed by
`<id> BEGIN` and `<id> END <exit code>`. The TypeScript adapter parses them into the typed result.
The agent also runs each mission's post-restore seed script (see "Reset").

Why the agent and not marker files over 9p:

1. **Processes, listening ports, limits and open files aren't files.** Something in the guest has
   to collect them either way, so a 9p design is a guest agent plus a slower transport.
2. **9p's host view can lag the guest.** `v86`'s Alpine build mounts its 9p root with
   `cache=loose`, and its `build-state.js` runs `sync` and drops caches before saving state. A
   marker written in the guest isn't guaranteed visible to `read_file` on the host without that.
   This is inferred from `v86`'s scripts, not measured.
3. **Git state needs Git.** Reading refs and packed objects from the host would mean a Git
   implementation in TypeScript. In the guest it's one `git` command.

9p stays as `v86`'s root filesystem and as a way to place large seed files at image-build time.

The agent is visible in `ps` as `sra-agent`. The lesson text says what it is, so a learner hunting
a culprit isn't misled, and it holds no ports or files a mission cares about. If a learner kills
it, `inittab` restarts it.

## Reset, seeds and hints

**Seeds.** Each mission gets a seed, random on first start and stored in the browser, so a reset
replays the same box and two learners get different ones. "Try a different box" picks a new seed.

**Reset.**

- **`shell`:** throw the `Bash` instance away and build a new one from `seed(seed)`. Milliseconds.
- **`linux`:** `restore_state` from the mission's snapshot, then the agent runs the mission's seed
  script (renames, which culprit to start, the stale pidfile). One snapshot per mission (#3, #25)
  keeps a full disk and running processes exact; the seed script only adds the variation, which a
  fixed snapshot can't.

**Hint ladder.** Two text hints, then Show me, as in the game. Each rung is opened by the learner,
never on a timer (spec section 7: a pause on every clock; these missions have no clock).

**Show me, in a terminal, types the next command at the prompt and doesn't press Enter.** A dimmed
comment line above it says why (`# du ranks directories by the space their files use`). The learner
reads it and presses Enter, or edits it first. Show me never runs a destructive command itself.

Each mission's reference solution is a list of steps, each `{ look, act, done }`: `look` is the
command that shows the evidence (`df -h /var/log`), `act` changes state (`gzip
/var/log/billing.log.1`), and `done(observed)` says the step has taken effect. Show me finds the
first step not done and types its `look`, then its `act` on the next press. Commands are built from
the seed and the current probe results, so they name the real PID and file. Using Show me counts as
a hint used, which is recorded (spec section 7: compare with your past self, hints used included).

## The mission interface

All three runtimes share one interface. Missions are data plus pure functions in the engine
(`packages/engine/terminal/`); runtimes live in the app (`src/features/terminal/`), because `v86`
needs a browser or Node host and the engine stays dependency-free.

```ts
// packages/engine/terminal/types.ts
type RuntimeKind = 'shell' | 'linux'

type Probe =
  | { kind: 'file'; path: string } // exists, size, inode, mode, content (capped at 64 KB)
  | { kind: 'dir'; path: string } // entries with size and inode
  | { kind: 'disk'; mount: string } // size, used, available in bytes
  | { kind: 'processes' } // pid, ppid, user, args, cwd, start time, nofile limit, open files
  | { kind: 'listeners' } // proto, address, port, pid
  | { kind: 'crontab'; user: string }
  | { kind: 'gitRef'; repo: string; ref: string } // commit id or null
  | { kind: 'gitIsAncestor'; repo: string; ancestor: string; descendant: string }
  | { kind: 'gitShow'; repo: string; ref: string; path: string } // file content at a commit

type Observed = Record<string, ProbeResult> // keyed by the mission's own probe names

interface Seeded {
  seed: number
  /** Seeded names and values the goal and Show me use: culprit, file names, error code. */
  facts: Record<string, string | number>
  /** shell: the files to create. linux: the snapshot and the script the agent runs after restore. */
  setup: { files: Record<string, string> } | { snapshot: string; script: string }
}

interface GoalPart {
  id: string
  met: boolean
  text: string
} // text says why when unmet

interface Mission {
  id: string // permanent, kebab-case
  runtime: RuntimeKind
  title: string
  situation: { from: 'Morgan' | 'Kai' | 'Alex' | 'Taylor' | 'PagerDoody'; text: string }
  seed(seed: number): Seeded
  probes(seeded: Seeded): Record<string, Probe>
  goal(seeded: Seeded, observed: Observed): GoalPart[] // done when every part is met
  hints: [string, string] | [string, string, string]
  solution: Array<{
    look: (s: Seeded, o: Observed) => string
    act?: (s: Seeded, o: Observed) => string
    done: (s: Seeded, o: Observed) => boolean
  }>
}

// src/features/terminal/runtime.ts: one per runtime
interface MissionRuntime {
  start(seeded: Seeded): Promise<void> // build the shell, or restore the snapshot and seed
  reset(): Promise<void> // the same, from the same Seeded
  probe(probes: Record<string, Probe>): Promise<Observed>
  attach(term: Terminal): void // xterm.js; the learner's keystrokes go to the shell or ttyS0
  destroy(): void
}
```

**One `xterm.js` front end** (`@xterm/xterm`) for both runtimes. For `linux`, bytes go both ways
over `ttyS0`. For `shell`, a small line editor in the front end handles typing, history and
Ctrl-C, and passes each line to `bash.exec`. `just-bash` resets the working directory and
environment on every `exec` call (its README says so), so the wrapper passes the `env` returned by
the previous call (`BashExecResult.env`) and its `PWD` as `cwd` into the next. Whether `cd` updates
`PWD` in that returned `env` is unverified; #24's first test should confirm it. `xterm.js` has a
`screenReaderMode` option, which the terminal turns on for the axe and screen-reader checks.

### Lessons

`LessonDo` gets a new kind, played on the lesson page like a simulation:

```ts
/** Terminal missions, played on the lesson page, in order. IDs from `@sra/engine/terminal/missions`. */
| { kind: 'terminal'; missions: string[]; summary: string }
```

```ts
// src/course/lessons/phase2.ts
export const LINUX_DISK_FULL: Lesson = {
  id: 'linux-disk-full',
  title: "What's eating the disk",
  summary: 'The log box is out of space. Find what filled it, free it, and keep the live log.',
  do: {
    kind: 'terminal',
    missions: ['disk-full', 'disk-still-full'],
    summary: 'Two pages from the log box.',
  },
  check: [
    {
      id: 'df-du-differ',
      text: 'Explain why df and du can disagree',
      from: 'disk-still-full/goal',
    },
    // …
  ],
}
```

The course validator rejects a lesson naming a mission that doesn't exist, as it does for chapters
and scenarios, and `CheckItem.from` takes `<mission id>/goal`. The four lessons are
`linux-files-and-logs` (missions 1–4), `linux-disk-full` (5–6), `linux-processes` (7–10) and
`git-what-changed` (11–12), all in `week-05`.

**Mission progress** (seed, solved, hints used, time to solve) needs somewhere to live. This note
proposes a separate browser key, `sra:missions:v1`, rather than new fields on `sra:progress:v1`, so
the course-progress shape doesn't change. See open questions.

## Sizes and timings

| What                                        | Size or time                | Status                                                                                                                         |
| ------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `v86` 0.5.476: `build/libv86.mjs`           | 360 KB, before compression  | Measured from the npm package's file list, 2026-11-23                                                                          |
| `v86` 0.5.476: `build/v86.wasm`             | 2.0 MB, before compression  | Measured, same                                                                                                                 |
| `just-bash` 3.6.1: `dist/bundle/browser.js` | 1.26 MB, before compression | Measured, same. What it adds to the built site after Vite is not                                                               |
| `@xterm/xterm` 6.0.0: `lib/xterm.mjs`       | 345 KB, before compression  | Measured, same                                                                                                                 |
| Alpine 9p image for the missions            | unknown                     | Unmeasured. `v86`'s Alpine Dockerfile installs `nodejs` by default; ours drops it and adds `git`, `lsof`, `iproute2`, `procps` |
| One mission snapshot                        | 10–30 MB                    | #3's estimate, unmeasured. Guest memory dominates it: `v86`'s own build uses 512 MB; ours should try 64–128 MB                 |
| Restore to prompt                           | "a few seconds"             | #3's estimate, unmeasured                                                                                                      |
| Agent round trip for a probe                | unknown                     | Unmeasured                                                                                                                     |

GitHub Pages documents a 1 GB limit on a published site and a soft bandwidth limit of 100 GB a month
([GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)).
Eight `linux` snapshots at 20 MB is 160 MB per learner who plays them all, which puts the soft limit
near 600 such learners a month. That makes where the snapshots are hosted a maintainer decision.

**Budgets for #25 to measure against:** a snapshot at most 30 MB compressed, and restore to a
prompt within 5 seconds on the reference low-end laptop (to be named; see open questions), with a
Playwright run under Chrome DevTools' 4× CPU throttle as the repeatable stand-in. #25 records both
numbers for each snapshot, as it already says.

**If `v86` is too slow**, in this order:

1. **Shrink.** Less guest memory, fewer packages, compressible filler (repeated log lines, not
   random bytes) for the full disk.
2. **Start early.** Fetch and restore in the background when the lesson page opens, while the
   learner reads the brief.
3. **Share a base.** Measure one shared snapshot plus each mission's seed script against one
   snapshot per mission. If the seed scripts are fast (everything but filling the disk should be),
   shared wins on download size.
4. **Fall back.** If it's still over budget, a lesson-page notice says the box is slow on this
   machine and offers the two spec-named missions in the simulated shell, with `ps`, `ss`, `kill`
   and `df` added as `just-bash` custom commands over a modeled process table. That's less real
   and a fair amount of work, so it's built only if the measurements call for it.

## Licensing

| Component                    | Claim (#3)   | Checked against                                                                                                                           | Result                                                                                                                                                                               |
| ---------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `just-bash`                  | Apache-2.0   | [vercel-labs/just-bash](https://github.com/vercel-labs/just-bash): `packages/just-bash/LICENSE` and `package.json`; npm `just-bash` 3.6.1 | **Confirmed.** The repository has no top-level license file, so GitHub shows no license; the package directory carries the Apache 2.0 text and `"license": "Apache-2.0"`.            |
| `just-bash` dependencies     | —            | npm `just-bash` 3.6.1 dependency list                                                                                                     | **Not checked** one by one. #24 runs a license check over what the browser bundle actually pulls in.                                                                                 |
| `v86`                        | BSD-2-Clause | [copy/v86](https://github.com/copy/v86): `LICENSE` and Readme "License"; npm `v86` 0.5.476                                                | **Confirmed.** Simplified BSD; the Readme lists third-party files under their own licenses (softfloat, zstd, test suites, MIT parts of `floppy.js`).                                 |
| SeaBIOS and VGABIOS binaries | —            | `copy/v86` `bios/COPYING.LESSER`                                                                                                          | **LGPL-3.0.** The BIOS files `v86` boots with are in its repository, not its npm package, so we would ship them ourselves.                                                           |
| Linux kernel, BusyBox, Git   | —            | `COPYING` in torvalds/linux and git/git, `LICENSE` in the BusyBox GitHub mirror                                                           | **GPL-2.0** (the kernel with the syscall note). The Alpine image ships their binaries from our site, which carries GPL source obligations. Needs the maintainer; see open questions. |
| Other Alpine packages        | —            | —                                                                                                                                         | **Not checked.** The image build should list every package and its license from `apk`.                                                                                               |
| `@xterm/xterm`               | —            | [xtermjs/xterm.js](https://github.com/xtermjs/xterm.js) and npm `@xterm/xterm` 6.0.0                                                      | **MIT.**                                                                                                                                                                             |

This is a reading of license files, not legal advice.

## Testing

- **Engine, no DOM (`packages/engine/terminal/`).** For every mission: `seed(n)` is the same twice
  and differs in its facts between seeds; the goal fails on a seeded-only fixture with the expected
  part unmet; it passes on the reference end state; and each trap in "Why a recipe fails" (delete
  the live log, restart `web`, `reset --hard` and force-push) fails with its own part. Fixtures are
  `Observed` objects, so these run in milliseconds.
- **Shell missions, real `just-bash` in Node.** `just-bash` runs in Node, so #24's tests seed a real
  instance, run the reference solution through the same wrapper the terminal uses, probe, and
  assert the goal; and drive Show me plus Enter until done, which proves Show me can't get stuck.
- **`linux` missions, real `v86` in Node.** `v86`'s own `build-state.js` runs the emulator under
  Node, so the same seed, solve and probe tests are possible for #25 and #26. They need the built
  images and are slow, so they go behind their own target (`make test/missions`), outside
  `make check`. Whether CI runs them on every PR is an open question.
- **Playwright, one golden path per runtime.** Played from the course page, as a learner would:
  `config-hunt` (shell), `disk-full` (linux) and `git-what-changed` (Git), each solved by Show me
  and Enter, then Reset, checking that the goal panel returns to unmet. Axe runs on the terminal
  page. When Phase 2 gets a playthrough like `e2e/phase1.spec.ts`, these join it.

## Gaps against #3

Posted on #3:

1. No design or child issue for the mission interface. This note proposes one: probes, pure goal
   predicates, and a runtime with `start`, `reset`, `probe` and `attach`.
2. #3 leaves the choice between a serial guest agent and 9p marker files open. This note picks the
   agent; 9p can't see processes or ports.
3. One fixed snapshot per mission can't vary between learners. Missions need a post-restore seed
   step, run by the agent.
4. `LessonDo` needs a `terminal` kind, and the validator needs to check mission IDs.
5. Mission progress (seed, hints used, solved) has no storage, like the Keep and past runs noted
   for the nines game.
6. The `just-bash` wrapper needs more than cwd and environment: line editing, history, Ctrl-C, and
   there is no editor or pager.
7. Licensing: the image ships GPL-2.0 binaries and LGPL-3.0 BIOS files; #3 lists only `v86`'s and
   `just-bash`'s licenses.
8. Measurement needs a named reference machine and should compare a shared base snapshot with one
   per mission. Snapshot hosting against GitHub Pages' bandwidth limit is a new question.

## Open questions for the maintainer

1. **GPL source for the image.** Shipping the Alpine image distributes GPL-2.0 binaries (kernel,
   BusyBox, Git). How should the academy meet the source requirement: publish the matching Alpine
   source packages next to the image, or something else?
2. **Where the snapshots are hosted.** GitHub Pages' soft limit is 100 GB a month. Serve them from
   Pages, from GitHub release assets, or from the S3 and CDN setup the spec plans for videos? And
   built in CI or committed (the repository's recommended limit is 1 GB)?
3. **The reference "cheap laptop"** for the 5-second budget. Which machine?
4. **Mission progress storage.** A new key, `sra:missions:v1`, or new fields on
   `sra:progress:v1`? Either is a saved shape learners will have forever.
5. **An editor in the simulated shell.** Mission 4 uses `sed -i` because `just-bash` has no editor.
   Accept that for week 5, or add a minimal `edit` command?
6. **`v86` tests in CI.** Run `make test/missions` on every PR (slow, needs the images) or nightly?
7. **The slow-machine fallback.** Is a simulated version of the two spec-named missions worth
   building if `v86` misses the budget, or is a notice enough?
