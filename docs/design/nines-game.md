# Nines versus cost: design note

The week 3 game for issue #17, built in #18. It also sets the model that Reliability for Everyone
module 2 (#6) runs on, and what the decision-simulation engine in #3 has to provide.

Phase 1's culture thread lands here: **reliability is a feature, and 100% is the wrong target.**
The game makes that visible by letting the learner buy reliability and watch what it costs in money
and in features, next to what their users actually notice.

## Where it sits

Week 3 today is one lesson, `inkwell-measure`, playing `ch6-seeing-inside` then `ch7-slo`. By the
end of `ch7-slo` the learner has picked an SLI (checkouts that succeed within 2 seconds), been
steered to 99.9% as the target, and been told 99.99% is "a fine later target, but expensive". The
nines game is where "expensive" gets a number. It picks up the same SLI, the same product
(`billing`, Inkwell's checkout) and the same starting target, 99.9%.

**Host: a lesson-page simulation, not a game chapter.** Add a second week 3 lesson, `inkwell-nines`
(a new permanent ID), after `inkwell-measure`, with a new `LessonDo` kind:

```ts
| { kind: 'simulation'; scenario: string; summary: string }
```

The lesson page renders one player component (`src/features/nines/`) for that kind. Reasons:

- Module 2 is not a feauxbernetes chapter, so it needs a lesson-page host anyway. One host for both
  means one integration, one Playwright path and one place the Keep is written.
- The lesson page already writes course progress (`sra:progress:v1`). The game page doesn't, and a
  chapter would also need a new `GameState` slice, a `GAME_STATE_VERSION` bump and a migration.
- The run is turn-based and short; it doesn't need the game's clock, Flack or tabs. Inkwell's people
  still appear: Morgan, Kai and Taylor speak through short message cards in the scenario data.

Module 1 of Reliability for Everyone reuses the Phase 1 lessons, so an Everyone learner plays the
short version in module 1 and the full year in module 2. That shapes the shared-engine
recommendation below.

## The decision loop

**Phase 1 version: six turns, one per month, starting at 99.9%.** About five to eight minutes.
Turn-based, so there is no clock to pause (spec section 7's pause rule holds trivially).

Each month Morgan asks "what does the team do this month?" The learner picks one card:

| Card                      | What happens                                                                                                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ship the next feature** | The next roadmap item ships (shared folders, comments, templates, offline mode, export, dark mode). Revenue grows. A month with a change in it is riskier.                              |
| **Buy the next nine**     | Shows its price first: team-months and running cost (table below). The new level takes effect at once; the team is busy building it for its team-months, so no features ship meanwhile. |
| **Drop a nine**           | Steps back down. Running cost falls from next month. Team time already spent is gone.                                                                                                   |
| **Promise 100%**          | Always offered, from any level. Kai warns once, then lets it through. See "100%" below.                                                                                                 |

The level taking effect at once is a deliberate simplification so the learner sees what a nine buys
within a six-month run; the build time is still charged, as features not shipped. The note in the
UI says so: "In real life the new nine arrives when the work is done."

**After each month, a report card** with four numbers, each with this month and the running total:

1. **Money**: revenue, reliability running cost, money lost to downtime, and profit.
2. **Features shipped**, by name, against the roadmap.
3. **Minutes of downtime**, against the month's allowance for the current level (the error budget
   from `ch7-slo`, in the same "minutes of full outage" unit).
4. **Users who noticed**, as two bars side by side: visits that failed **because of Inkwell**, and
   visits that failed **because of the user's own phone or Wi-Fi**. The second bar barely moves
   whatever the learner buys. That is the ceiling (next section).

One line from Taylor (support) or Kai reacts to the month, for example Taylor relaying angry mail
after a long outage, or Kai pointing out that the Wi-Fi bar is now ten times the Inkwell bar.

## Downtime per nine

Exact arithmetic, no source needed. A month is 30 days (43,200 minutes, as `ch7-slo` and
`telemetry/slo.ts` use); a year is 365 days (525,600 minutes).

| Target  | Allowed downtime per month | Per year           |
| ------- | -------------------------- | ------------------ |
| 99%     | 432 min (7.2 h)            | 5,256 min (87.6 h) |
| 99.9%   | 43.2 min                   | 525.6 min (8.76 h) |
| 99.99%  | 4.32 min                   | 52.56 min          |
| 99.999% | 0.432 min (about 26 s)     | 5.256 min          |
| 100%    | 0                          | 0                  |

## The cost model

**Inkwell is made up, so every Inkwell-specific figure is an assumption.** The model is honest about
that in two ways: the shape of the curve comes from sourced claims, and the game's tests pin the
_ordering_ of outcomes (which strategy wins), not the dollar amounts. The figures are rough orders
of magnitude, rounded so nobody mistakes them for measurements. The UI says so on the report card:
"Inkwell's numbers are made up. The shape is real."

Every number lives in the scenario file as a `Sourced` value (see "Engine requirements"), so this
table and the code cannot drift apart unlabeled.

### Sourced claims the model rests on

- **Each nine costs much more than the last.** SRE book ch. 3, [Embracing Risk](https://sre.google/sre-book/embracing-risk/),
  "Managing Risk": cost does not grow linearly, and one more increment of reliability may cost on
  the order of 100 times the previous one.
- **The cost comes in two kinds:** redundant machines and the opportunity cost of engineers working
  on reliability instead of features. Same chapter, same section. These become the two prices on
  every nine: running cost and team-months.
- **Valuing a nine: revenue times the change in availability.** Same chapter, "Identifying the Risk
  Tolerance of Consumer Services", which works an example for a $1M service. The game uses that
  method for lost checkouts.
- **The user's own side fails too.** Same chapter: the chapter introduction makes the smartphone
  point (next section), and the "Cost" subsection gives a typical ISP background error rate of
  between 0.01% and 1%.
- **Most outages come from changes.** SRE book ch. 1, [Introduction](https://sre.google/sre-book/introduction/),
  "Change Management": roughly 70% of outages are due to changes in a live system.

### Inkwell's numbers

| Quantity                                 | Value                                                             | Status                                                                                                                 |
| ---------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Paying subscribers                       | 50,000                                                            | Assumption                                                                                                             |
| Price                                    | $10 a month, so about $500k revenue a month                       | Assumption                                                                                                             |
| Profit before reliability spending       | about $55k a month (roughly 10% margin)                           | Assumption                                                                                                             |
| Visits per subscriber                    | 30 a month, so 1.5M visits a month                                | Assumption                                                                                                             |
| Revenue from a shipped feature           | +1% of revenue, from the next month                               | Assumption                                                                                                             |
| Lost checkouts                           | revenue × fraction of the month down                              | Method sourced (ch. 3); inputs assumed                                                                                 |
| Visits that fail because of Inkwell      | visits × fraction of the month down                               | Arithmetic on assumed visits                                                                                           |
| Cancellations                            | 2% of users who hit an Inkwell failure cancel                     | Assumption. We found no good public figure; this is the weakest number in the model and should be labeled so in the UI |
| User's own phone and network unavailable | 0.1% of visits, so about 1,500 failed visits a month at any level | Assumption, chosen inside the sourced 0.01%–1% ISP range (ch. 3)                                                       |
| Downtime in a month that ships a change  | the level's full monthly allowance, on average                    | Assumption: a team running at a level roughly spends its budget                                                        |
| Downtime in a month with no change       | 30% of that                                                       | Derived from the sourced 70% figure (ch. 1)                                                                            |

### The price of each nine

| Level   | What Inkwell buys (shown on the card)                                                   | Team-months to build | Extra running cost a month | Status                    |
| ------- | --------------------------------------------------------------------------------------- | -------------------- | -------------------------- | ------------------------- |
| 99%     | One zone, fixes in business hours                                                       | —                    | $0                         | Module 2's starting point |
| 99.9%   | A second zone, automatic failover, an on-call rotation, burn-rate alerts (`ch8-alerts`) | 1                    | ~$5k                       | Assumption                |
| 99.99%  | A second region, a database replica with tested failover, canary releases, 24/7 on-call | 2                    | ~$25k                      | Assumption                |
| 99.999% | Active-active regions, a dedicated reliability team, regular failure drills             | 4                    | ~$125k                     | Assumption                |
| 100%    | Everything above, plus no changes ever                                                  | all remaining        | ~$125k                     | Assumption                |

Running cost grows about five times per nine. That is deliberately **gentler** than the book's
"may cost 100 times", so if the model is wrong it understates the cost of the top nines, and the
lesson still holds.

### What the model gives (expected values, before seeded luck)

Phase 1, six months from 99.9%:

| Strategy                  | Profit over 6 months | Features | Downtime | Visits failed: Inkwell / own Wi-Fi |
| ------------------------- | -------------------- | -------- | -------- | ---------------------------------- |
| Ship every month at 99.9% | ~$370k               | 6        | ~260 min | ~9,000 / ~9,000                    |
| Buy 99.99%, then ship     | ~$210k               | 4        | ~20 min  | ~700 / ~9,000                      |
| Buy up to 99.999%         | about −$220k         | 0        | ~3 min   | ~100 / ~9,000                      |
| Promise 100% in month 1   | about −$420k         | 0        | seconds  | ~30 / ~9,000                       |

These exclude the scripted DNS incident, which adds about 3 minutes and about 100 failed visits to
every run, and is why the 100% run never reaches zero. They are what the formulas above produce;
the builder should regenerate them from the scenario file rather than copy them. The tests assert
the ordering, and that the 99.999% and 100% runs end with a cumulative loss.

## Why 99.99% beats 99.999% for Inkwell

The SRE book's ch. 3 ([Embracing Risk](https://sre.google/sre-book/embracing-risk/)) makes the
point in its opening: someone on a phone that is itself only 99% reliable cannot tell 99.99% from
99.999%, because the less reliable parts between them and the service dominate what they
experience.

The game shows this rather than says it. A visit fails if Inkwell is down **or** the user's own side
is. With the user's side at 99.9%, the share of visits that fail is roughly the sum of the two
failure rates:

| Inkwell at | Inkwell's share | User's own share | Total failed | Change from the nine below |
| ---------- | --------------- | ---------------- | ------------ | -------------------------- |
| 99.9%      | 0.1%            | 0.1%             | ~0.2%        |                            |
| 99.99%     | 0.01%           | 0.1%             | ~0.11%       | about 45% fewer failures   |
| 99.999%    | 0.001%          | 0.1%             | ~0.101%      | about 8% fewer failures    |

The fifth nine costs about five times the fourth (in this model; the book says it may be far more)
and removes one failure in twelve that users see. Nearly all the rest are their own Wi-Fi,
which Inkwell can't fix. The two-bar chart on the report card is this table, month by month.

Whether the fourth nine is worth it depends on the business, not on the ceiling. At Inkwell's size
in Phase 1 it isn't (it costs about $160k over six months to avoid about 170 cancellations).
Module 2 adds the case where it is: a customer who needs it in a contract.

## 100%

Promise 100% is always on offer and goes through after one warning from Kai. It:

- puts the running cost at the 99.999% level at once,
- stops all shipping for the rest of the run, because the only way to never cause an outage with a
  change is to never change anything (the "Ship" card shows as frozen, with Kai's reason), and
- still has downtime. The no-change rate is 30% of the 99.999% allowance, and every scenario has one
  scripted incident no redundancy prevents (Phase 1: a three-minute DNS mistake at Inkwell's domain
  registrar in month 4), so the run never reports 100%.

The end card states it plainly: "Promised 100%. Delivered 99.99x%. Spent $X. Shipped nothing. Your
users' own Wi-Fi failed them about 9,000 times." Nothing is failed (planning.md's rule): the run
completes and the learner can play again.

## How a run ends

After the last month, Morgan's review shows:

- the four totals from the report card,
- a **ledger per nine bought**: what it cost (running cost plus features not shipped, priced at the
  revenue they would have brought) against what it saved (lost checkouts and cancellations avoided),
  so a nine that cost more than it returned says so in one line,
- the learner's **earlier runs** of the same scenario, side by side. No other learners, no
  leaderboard, no grade (spec section 7). Replaying uses the same seed by default, so two strategies
  meet the same luck; a "new luck" button changes the seed.

**What the learner should be able to say afterwards:**

1. Each nine cuts the allowed downtime tenfold and costs much more than the one before.
2. Reliability competes with features for the same team. Buying a nine means shipping less.
3. Past a point, users can't tell: their own phone and Wi-Fi fail more often than the product.
4. 100% can't be bought. Promising it means never changing anything, and it still isn't 100%.
5. The right target is where the next nine costs more than users would notice. For Inkwell's
   checkout today that is 99.9%, and it can change when the business does.

## The Keep: the learner's first SLO

**`ch7-slo` does not record a choice.** Its `choose-target` step has one accepted answer
(`three-nines`); the other picks only get Kai's response, and the engine keeps just the last wrong
answer (`story.lastWrongAnswer`). Course progress (`src/progress/progress.ts`) stores ticked check
items and timestamps only, and `parseProgress` drops any field it doesn't know. The `keep` on
`inkwell-measure` is static text.

So **the game adds the choice at its end**, and the Keep moves from `inkwell-measure` to
`inkwell-nines`. After the review, Kai asks: "So what do we promise for checkout?" Options: 99%,
99.9%, 99.99%, 99.999%, 100%. Any of the first four is recorded, each with a Kai line tied to the
learner's own run ("You saw what 99.99% cost us. If the school deal comes, we'll revisit."). 100%
gets Kai's explanation that an SLO needs an error budget and 100% has none, and the question again.

What is recorded, per lesson:

```ts
keep?: { kind: 'slo'; sli: string; target: number; windowDays: 30; chosenAt: string }
```

This is a new optional field on `LessonProgress` in `sra:progress:v1`. It renames nothing and an
old save still parses, so it should not need a version bump, but `parseProgress` must learn to keep
it, and the saved-shape rule in `AGENTS.md` makes it a change to get the maintainer's eye on in #18.
The lesson page's Keep section shows the recorded SLO when there is one.

## Sharing with module 2: one engine, two scenario files

**Recommendation: one engine and one player, with two scenario files: `nines-half-year` (Phase 1)
and `nines-year` (module 2).** An Everyone learner plays both, module 1 then module 2, so one game
for both would make module 2 a repeat; two scenarios on one model make it a deeper second pass whose
numbers agree with the first.

What `nines-year` changes, all as data:

|                             | `nines-half-year`                | `nines-year`                                                                                                                                                                          |
| --------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Turns                       | 6 months                         | 12 months                                                                                                                                                                             |
| Start                       | 99.9% (where `ch7-slo` left off) | 99%, so the first nine is clearly worth buying                                                                                                                                        |
| Ongoing team time per level | none                             | a share of each month spent keeping the level (e.g. 10%, 25%, 50%; assumption), so features ship more slowly at higher levels                                                         |
| Scripted events             | one DNS incident                 | a cloud provider region outage that only a second region rides through; a school district offering a contract (~$50k a month, assumption) that requires 99.95% in an SLA from month 4 |
| Lesson                      | the price of a nine; the ceiling | the same, plus: the right target moves when the business does, and an SLA is a promise with a penalty, an SLO is the internal target that keeps it                                    |
| Keep                        | the first SLO                    | none in the spec; module 2 leaves with "why 100% is the wrong target"                                                                                                                 |

With the contract, the fourth nine pays for itself and 99.99% becomes the right answer, which is
exactly what `ch7-slo` promised ("a fine later target"). The fifth nine still doesn't, because of the
ceiling. Module 2 reaches 99.99% honestly instead of the game declaring it.

Checked against module 2's needs in the spec (section 5) and #6: a simulated year (12 turns),
buying nines (the same ladder), cost in money and features (the same report card), leaves with why
100% is the wrong target (the 100% card and the end ledger), browser only with nothing typed
(cards and clicks), one sitting (about 15 to 20 minutes). The module still needs its video brief,
which is outside this note.

## Engine requirements

A new module, `packages/engine/decision`, pure TypeScript under the engine's existing lint boundary
(no React, no DOM, nothing from `src/`).

**Keep the core small.** A generic turn loop, keyed randomness, replay and labeled numbers; the nines
model as one module on top. Module 5's launch-or-fix quarter is the other decision simulation in #3,
but it isn't designed yet, so nothing in the core should be shaped for it beyond the turn loop.

What it needs:

- **Seeded, keyed randomness.** Each month's incidents come from `hash01` keyed by
  `seed:scenario:turn:level:changed`, not from a stream. A different choice in month 2 then doesn't
  reshuffle month 5's luck at the same level, which is what makes "same seed, different strategy"
  a fair comparison. Needs a small helper on top of `hash01`: a count and a duration drawn from
  keys, with a mean equal to the level's allowance.
- **A turn clock**, not the game's millisecond clock. The turn index is the only time.
- **The scenario as data**: ladder, roadmap, economy, scripted events and character lines, in a
  plain object with no functions, so module 2 is a second file and not a second code path.
- **Labeled numbers.** Every economy value is a `Sourced`: `{ value; source: url }` or
  `{ value; assumption: string }`. A test fails on any economy number without one, which enforces
  this note's rule in code.
- **Deterministic replay.** The state is a pure function of scenario, seed and decisions, so a save
  is `{ scenario, seed, decisions }` and never needs a migration when the derived state changes.
- **DOM-free tests**: same seed and decisions give the same run; the mean downtime of shipping
  months over many seeds is within a tolerance of each level's allowance; the outcome orderings in
  "What the model gives" hold; 100% never reports 100%; the user's-own-side bar exceeds Inkwell's
  at 99.99% and up.

Proposed API:

```ts
type Sourced = { value: number; source: string } | { value: number; assumption: string }

interface DecisionScenario {
  id: string
  turns: number
  start: { level: LevelId }
  levels: Level[] // price, build time, upkeep, allowance; figures as Sourced
  roadmap: Feature[]
  economy: Record<string, Sourced>
  events: ScriptedEvent[] // by turn
  lines: Record<string, string> // Morgan, Kai, Taylor
}

type Decision =
  { type: 'ship' } | { type: 'buyNine' } | { type: 'dropNine' } | { type: 'promise100' }

function startRun(scenario: DecisionScenario, seed: number): RunState
function legalDecisions(scenario: DecisionScenario, state: RunState): Decision[]
function decide(scenario: DecisionScenario, state: RunState, decision: Decision): RunState // appends a TurnReport
function replay(scenario: DecisionScenario, seed: number, decisions: Decision[]): RunState
function summarize(scenario: DecisionScenario, state: RunState): RunSummary // totals and the per-nine ledger
```

`RunState` holds the turn, level, team busy months, features shipped, subscribers, money and a
`TurnReport[]`. `decide` rejects a decision `legalDecisions` doesn't list.

### Gaps against #3

1. **No design or child issue for "decision simulations".** #3 lists it as one bullet. This note is
   the first design; the engine above should be its child issue.
2. **#3 says every tool runs on the engine's fake clock.** A decision simulation runs in turns. The
   millisecond clock and `tick` in `game.ts` don't fit; it needs a turn clock, kept out of
   `GameState`.
3. **The seeded RNG lives inside `telemetry`** (`telemetry/rng.ts`, only `hash01` and `noise`). A
   second consumer means moving it to a shared engine module, plus keyed count and duration draws.
4. **No host for a tool outside the game.** `LessonDo` has only `game` and `text`. A `simulation`
   kind is needed, and the course validator should reject a lesson naming a scenario that doesn't
   exist, as it does for chapters.
5. **No place to store a Keep.** `sra:progress:v1` stores check items and timestamps only, and
   `parseProgress` drops unknown fields. Every Keep in the course (week 3's SLO, week 4's scorecard,
   later documents) needs this.
6. **No record of past runs** for spec section 7's "compare with your past self". The run summaries
   need a home in browser storage, per scenario.
7. **"A demo lesson that reaches a checkable goal state"** needs defining for a decision simulation:
   proposed as "the run ended and, where the lesson has one, the Keep was recorded".
8. **No convention for sourced numbers.** The `Sourced` type above would be the toolkit's
   convention for every simulation that shows a figure.
