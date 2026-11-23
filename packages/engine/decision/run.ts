import { drawOutages } from './draw'
import type {
  Decision,
  DecisionScenario,
  DecisionType,
  LedgerRow,
  Level,
  LevelId,
  RunState,
  RunSummary,
  TurnReport,
} from './types'

/** A month is 30 days, as `ch7-slo` and `telemetry/slo.ts` count it. */
export const MINUTES_PER_MONTH = 30 * 24 * 60

/** Every decision type, for code that lists them (the course checks `from` against these). */
export const DECISION_TYPES: readonly DecisionType[] = [
  'ship',
  'buyNine',
  'dropNine',
  'promise100',
  'hold',
]

function levelIndex(scenario: DecisionScenario, id: LevelId): number {
  const index = scenario.levels.findIndex((level) => level.id === id)
  if (index < 0) throw new Error(`scenario "${scenario.id}" has no level "${id}"`)
  return index
}

export function levelOf(scenario: DecisionScenario, id: LevelId): Level {
  return scenario.levels[levelIndex(scenario, id)]
}

/** Minutes of full outage the level's target allows in a month: its error budget. */
export function allowanceMinutes(level: Level): number {
  return (1 - level.target) * MINUTES_PER_MONTH
}

/** The level a "Buy the next nine" card would buy, if there is one to buy. */
export function nextNine(scenario: DecisionScenario, state: RunState): Level | undefined {
  const next = scenario.levels[levelIndex(scenario, state.level) + 1]
  return next && !next.promise ? next : undefined
}

/** The level a "Drop a nine" card would drop to, if there is one. */
export function previousNine(scenario: DecisionScenario, state: RunState): Level | undefined {
  return scenario.levels[levelIndex(scenario, state.level) - 1]
}

function promiseLevel(scenario: DecisionScenario): Level | undefined {
  return scenario.levels.find((level) => level.promise)
}

export function startRun(scenario: DecisionScenario, seed: number): RunState {
  levelIndex(scenario, scenario.start.level)
  return {
    scenario: scenario.id,
    seed,
    turn: 0,
    level: scenario.start.level,
    busyMonths: 0,
    promised: false,
    shipped: [],
    subscribers: scenario.economy.subscribers.value,
    decisions: [],
    reports: [],
  }
}

export function isFinished(scenario: DecisionScenario, state: RunState): boolean {
  return state.turn >= scenario.turns
}

/**
 * What the learner may do this month. Promising 100% is always on offer until it's made. While the
 * team is building a nine, or after a 100% promise, the month is spent holding.
 */
export function legalDecisions(scenario: DecisionScenario, state: RunState): Decision[] {
  if (isFinished(scenario, state)) return []
  if (state.promised) return [{ type: 'hold' }]
  const promise: Decision[] = promiseLevel(scenario) ? [{ type: 'promise100' }] : []
  if (state.busyMonths > 0) return [{ type: 'hold' }, ...promise]
  return [
    ...(state.shipped.length < scenario.roadmap.length ? [{ type: 'ship' } as const] : []),
    ...(nextNine(scenario, state) ? [{ type: 'buyNine' } as const] : []),
    ...(previousNine(scenario, state) ? [{ type: 'dropNine' } as const] : []),
    ...promise,
  ]
}

/** Plays one month. Throws on a decision `legalDecisions` doesn't list. */
export function decide(scenario: DecisionScenario, state: RunState, decision: Decision): RunState {
  if (!legalDecisions(scenario, state).some((legal) => legal.type === decision.type)) {
    throw new Error(`"${decision.type}" is not a legal decision in month ${state.turn + 1}`)
  }
  const { economy } = scenario
  const before = levelOf(scenario, state.level)
  let level = before
  let busyMonths = Math.max(0, state.busyMonths - 1)
  let building = busyMonths > 0 ? state.building : undefined
  let spentOn = state.busyMonths > 0 ? state.building : undefined
  let shipped: string | undefined
  let promised = state.promised

  switch (decision.type) {
    case 'ship':
      shipped = scenario.roadmap[state.shipped.length].id
      break
    case 'buyNine':
      level = nextNine(scenario, state)!
      busyMonths = level.teamMonths.value - 1
      building = busyMonths > 0 ? level.id : undefined
      spentOn = level.id
      break
    case 'dropNine':
      level = previousNine(scenario, state)!
      break
    case 'promise100':
      level = promiseLevel(scenario)!
      promised = true
      busyMonths = 0
      building = undefined
      break
  }
  if (promised) spentOn = level.id

  const changed = shipped !== undefined
  // A nine takes effect at once and is paid for at once; a dropped one is paid for to the month end.
  const charged = decision.type === 'dropNine' ? before : level

  const mean = level.downtimeWithChange.value * (changed ? 1 : economy.noChangeDowntimeShare.value)
  const luck = drawOutages(
    `${state.seed}:${scenario.id}:${state.turn}:${level.id}:${changed}`,
    mean
  )
  const events = scenario.events.filter((event) => event.turn === state.turn)
  const downtimeMinutes =
    luck.minutes + events.reduce((sum, event) => sum + event.downtimeMinutes.value, 0)
  const downFraction = downtimeMinutes / MINUTES_PER_MONTH

  const baseRevenue = state.subscribers * economy.price.value
  const revenue = baseRevenue * (1 + economy.featureLift.value * state.shipped.length)
  const runningCost = charged.runningCost.value
  const lostCheckouts = revenue * downFraction
  const visits = state.subscribers * economy.visitsPerSubscriber.value
  const failedVisitsInkwell = visits * downFraction
  const failedVisitsOwnSide = visits * economy.ownSideFailureRate.value
  const allowance = allowanceMinutes(level)

  const report: TurnReport = {
    turn: state.turn,
    decision,
    level: level.id,
    changed,
    ...(shipped ? { shipped } : {}),
    ...(spentOn ? { spentOn } : {}),
    revenue,
    runningCost,
    lostCheckouts,
    profit: revenue - economy.otherCosts.value - runningCost - lostCheckouts,
    downtimeMinutes,
    allowanceMinutes: allowance,
    outages: luck.count + events.length,
    events: events.map((event) => event.id),
    visits,
    failedVisitsInkwell,
    failedVisitsOwnSide,
    cancellations: failedVisitsInkwell * economy.cancelRate.value,
    reaction: '',
  }
  report.reaction = reactionFor(scenario, state, report)

  return {
    ...state,
    turn: state.turn + 1,
    level: level.id,
    busyMonths,
    building,
    promised,
    shipped: shipped ? [...state.shipped, shipped] : state.shipped,
    subscribers: state.subscribers - report.cancellations,
    decisions: [...state.decisions, decision],
    reports: [...state.reports, report],
  }
}

/** Which character line reacts to the month: the most newsworthy thing that happened. */
function reactionFor(scenario: DecisionScenario, state: RunState, report: TurnReport): string {
  const candidates = [
    ...report.events.map((id) => `event.${id}`),
    report.decision.type === 'promise100' ? 'promised' : '',
    state.promised ? 'frozen' : '',
    report.downtimeMinutes > report.allowanceMinutes && report.allowanceMinutes > 0
      ? 'overBudget'
      : '',
    report.failedVisitsOwnSide >= 10 * report.failedVisitsInkwell ? 'ownSideDominates' : '',
    report.decision.type === 'hold' ? 'building' : '',
    report.decision.type,
  ]
  return candidates.find((key) => key && scenario.lines[key]) ?? ''
}

/** The run a scenario, seed and list of decisions give. Same inputs, same run, every time. */
export function replay(
  scenario: DecisionScenario,
  seed: number,
  decisions: readonly Decision[]
): RunState {
  return decisions.reduce(
    (state, decision) => decide(scenario, state, decision),
    startRun(scenario, seed)
  )
}

const sum = (reports: readonly TurnReport[], pick: (report: TurnReport) => number) =>
  reports.reduce((total, report) => total + pick(report), 0)

export function summarize(scenario: DecisionScenario, state: RunState): RunSummary {
  const { reports } = state
  const downtimeMinutes = sum(reports, (r) => r.downtimeMinutes)
  return {
    months: reports.length,
    finished: isFinished(scenario, state),
    revenue: sum(reports, (r) => r.revenue),
    runningCost: sum(reports, (r) => r.runningCost),
    lostCheckouts: sum(reports, (r) => r.lostCheckouts),
    profit: sum(reports, (r) => r.profit),
    shipped: state.shipped,
    downtimeMinutes,
    allowanceMinutes: sum(reports, (r) => r.allowanceMinutes),
    delivered: reports.length ? 1 - downtimeMinutes / (reports.length * MINUTES_PER_MONTH) : 1,
    failedVisitsInkwell: sum(reports, (r) => r.failedVisitsInkwell),
    failedVisitsOwnSide: sum(reports, (r) => r.failedVisitsOwnSide),
    cancellations: sum(reports, (r) => r.cancellations),
    finalLevel: state.level,
    promised: state.promised,
    ledger: ledger(scenario, state),
  }
}

/**
 * Each nine the run held above where it started, priced against the level below it. Uses expected
 * downtime, not the run's luck, so the verdict on a nine doesn't depend on a lucky month.
 *
 * - Cost: the extra running cost, plus each month the team spent on it instead of a feature, priced
 *   at the revenue that feature would have brought by the end of the run.
 * - Saved: the lost checkouts and the cancellations (priced to the end of the run) it avoided. A
 *   month spent on it is compared with a month that shipped at the level below, since that's what
 *   the team would otherwise have done.
 */
function ledger(scenario: DecisionScenario, state: RunState): LedgerRow[] {
  const { economy } = scenario
  const startIndex = levelIndex(scenario, scenario.start.level)
  const reached = Math.max(-1, ...state.reports.map((r) => levelIndex(scenario, r.level)))
  const share = economy.noChangeDowntimeShare.value
  const rows: LedgerRow[] = []

  for (let index = startIndex + 1; index <= reached; index++) {
    const nine = scenario.levels[index]
    const below = scenario.levels[index - 1]
    const row: LedgerRow = {
      level: nine.id,
      monthsHeld: 0,
      runningCost: 0,
      featuresForgone: 0,
      forgoneRevenue: 0,
      saved: 0,
      cost: 0,
    }
    let subscribers = economy.subscribers.value
    for (const report of state.reports) {
      const remaining = scenario.turns - 1 - report.turn
      const baseRevenue = subscribers * economy.price.value
      const visits = subscribers * economy.visitsPerSubscriber.value
      subscribers -= report.cancellations
      if (levelIndex(scenario, report.level) < index) continue
      row.monthsHeld++
      row.runningCost += nine.runningCost.value - below.runningCost.value
      const spent = report.spentOn === nine.id
      if (spent) {
        row.featuresForgone++
        row.forgoneRevenue += economy.featureLift.value * baseRevenue * remaining
      }
      const minutesBelow = below.downtimeWithChange.value * (spent || report.changed ? 1 : share)
      const minutesHere = nine.downtimeWithChange.value * (report.changed ? 1 : share)
      const avoided = (minutesBelow - minutesHere) / MINUTES_PER_MONTH
      row.saved +=
        avoided * report.revenue +
        avoided * visits * economy.cancelRate.value * economy.price.value * remaining
    }
    row.cost = row.runningCost + row.forgoneRevenue
    rows.push(row)
  }
  return rows
}
