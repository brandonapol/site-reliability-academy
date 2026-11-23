/**
 * A number the learner sees, labeled with where it comes from: a public source, or an assumption
 * stated in words. Every figure in a decision scenario is one of these, and a test fails on any
 * figure without a label (docs/design/nines-game.md → "The cost model").
 */
export type Sourced = { value: number; source: string } | { value: number; assumption: string }

export type LevelId = string

/** One rung of the reliability ladder: a target and what it takes to run at it. */
export interface Level {
  id: LevelId
  /** As shown, e.g. "99.9%". */
  label: string
  /** The availability target as a fraction, e.g. 0.999. Exact, so not a `Sourced`. */
  target: number
  /** What the team builds to reach this level, shown on the "Buy the next nine" card. */
  buys: string
  /** Months of the whole team's time to build it. Ignored for a `promise` level. */
  teamMonths: Sourced
  /** Running cost a month at this level, in dollars. The total at this level, not the extra. */
  runningCost: Sourced
  /** Average minutes of full outage in a month that ships a change. */
  downtimeWithChange: Sourced
  /**
   * The 100% rung: reached only by promising it, never by buying. It takes the rest of the run and
   * freezes shipping, because the only way to never break anything with a change is to never
   * change anything.
   */
  promise?: true
}

export interface Feature {
  id: string
  name: string
}

/** An outage no level prevents, e.g. a mistake at the domain registrar. */
export interface ScriptedEvent {
  id: string
  /** Zero-based month index. */
  turn: number
  downtimeMinutes: Sourced
}

export interface Economy {
  subscribers: Sourced
  /** Dollars a subscriber pays a month. */
  price: Sourced
  /** Everything that isn't reliability spending, a month. Revenue minus this is the profit before
   * reliability. */
  otherCosts: Sourced
  visitsPerSubscriber: Sourced
  /** Revenue each shipped feature adds from the next month, as a fraction of base revenue. */
  featureLift: Sourced
  /** Share of visits that hit an Inkwell failure and end in a cancellation. */
  cancelRate: Sourced
  /** Share of visits that fail on the user's own phone or network, whatever Inkwell does. */
  ownSideFailureRate: Sourced
  /** A month without a change has this share of a changing month's downtime. */
  noChangeDowntimeShare: Sourced
}

/** A character's line. `speaker` is a cast id from the game (`morgan`, `kai`, `taylor`). */
export interface Line {
  speaker: string
  text: string
}

export interface KeepOption {
  level: LevelId
  /** The reply to this choice. */
  reply: Line
  /** False for an option that can't be an SLO (100%): the reply explains and the question stays. */
  accepted: boolean
}

/** The end-of-run choice that becomes the lesson's Keep: an SLO for one SLI. */
export interface SloChoice {
  sli: string
  windowDays: 30
  question: Line
  options: KeepOption[]
}

export type DecisionType = 'ship' | 'buyNine' | 'dropNine' | 'promise100' | 'hold'

export type Decision = { type: DecisionType }

/**
 * A decision simulation as plain data, with no functions, so a second scenario is a second file
 * and not a second code path.
 */
export interface DecisionScenario {
  id: string
  title: string
  /** Months in a run. */
  turns: number
  start: { level: LevelId }
  /** Lowest target first. A `promise` level, if any, comes last. */
  levels: Level[]
  roadmap: Feature[]
  economy: Economy
  events: ScriptedEvent[]
  /** Character lines by key. `decide` picks one key per month (`TurnReport.reaction`). */
  lines: Record<string, Line>
  /** Card titles and descriptions, by decision type. */
  cards: Record<DecisionType, { title: string; description: string }>
  keep?: SloChoice
}

/** One month, as the report card shows it. Money in dollars, downtime in minutes. */
export interface TurnReport {
  turn: number
  decision: Decision
  /** The level in effect this month. */
  level: LevelId
  /** True when a change shipped this month. */
  changed: boolean
  /** The feature that shipped this month, if one did. */
  shipped?: string
  /** The level the team's time went to this month instead of a feature, if any. */
  spentOn?: LevelId
  revenue: number
  runningCost: number
  lostCheckouts: number
  profit: number
  downtimeMinutes: number
  /** The error budget at this month's level, in minutes of full outage. */
  allowanceMinutes: number
  /** Outages this month, scripted ones included. */
  outages: number
  /** Scripted events that happened this month. */
  events: string[]
  visits: number
  failedVisitsInkwell: number
  failedVisitsOwnSide: number
  cancellations: number
  /** Key into `DecisionScenario.lines`. */
  reaction: string
}

/**
 * The whole run. A pure function of scenario, seed and decisions (see `replay`), so a save only
 * ever needs `{ scenario, seed, decisions }`.
 */
export interface RunState {
  scenario: string
  seed: number
  /** Months played so far: the turn clock. */
  turn: number
  level: LevelId
  /** Months the team still owes to building `building`. */
  busyMonths: number
  building?: LevelId
  promised: boolean
  /** Feature ids, in the order they shipped. */
  shipped: string[]
  subscribers: number
  decisions: Decision[]
  reports: TurnReport[]
}

/** One nine the run held above where it started: what it cost against what it saved. */
export interface LedgerRow {
  level: LevelId
  monthsHeld: number
  /** Extra running cost over the level below, for the months held. */
  runningCost: number
  /** Features not shipped while the team built it. */
  featuresForgone: number
  /** Revenue those features would have brought by the end of the run. */
  forgoneRevenue: number
  /** Lost checkouts and cancellations it avoided, against the level below. Expected values. */
  saved: number
  /** `runningCost + forgoneRevenue`. */
  cost: number
}

export interface RunSummary {
  months: number
  finished: boolean
  revenue: number
  runningCost: number
  lostCheckouts: number
  profit: number
  shipped: string[]
  downtimeMinutes: number
  allowanceMinutes: number
  /** The availability actually delivered over the run. */
  delivered: number
  failedVisitsInkwell: number
  failedVisitsOwnSide: number
  cancellations: number
  finalLevel: LevelId
  promised: boolean
  ledger: LedgerRow[]
}
