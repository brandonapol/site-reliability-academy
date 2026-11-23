import type { Incident, ScoreExplainer, ScoreMetric } from './types'

/** The four numbers from one run. Undefined where the incident never reached that point. */
export type ScoreValues = Record<ScoreMetric, number | undefined>

/** This run against the learner's own earlier ones. Lower is better for all four numbers. */
export type Trend = 'better' | 'same' | 'worse'

export interface ScoreRow {
  metric: ScoreMetric
  label: string
  /** Fake-clock ms for the three durations; a head count for `customersAffected`. Undefined when
   * the incident never reached that point (e.g. never acknowledged). */
  value?: number
  /** The learner's previous run and their best earlier run. Both absent on a first run. */
  previous?: number
  best?: number
  /** How this run compares with the previous one. */
  trend?: Trend
  /** What moves this number. No pass/fail and no benchmark: just what the learner's choices did. */
  moves: string
}

export const SCORE_METRICS: readonly ScoreMetric[] = [
  'mtta',
  'timeToMitigate',
  'timeToResolve',
  'customersAffected',
]

function since(start: number | undefined, end: number | undefined): number | undefined {
  if (start === undefined || end === undefined) return undefined
  return Math.max(0, end - start)
}

/**
 * The raw numbers: time to acknowledge (page → ack), time to mitigate and time to resolve (both
 * measured from when the incident started, i.e. the page), and customers affected.
 */
export function scoreValues(incident: Incident): ScoreValues {
  const { marks, startedAt } = incident
  return {
    mtta: since(marks.paged, marks.acked),
    timeToMitigate: since(startedAt, marks.mitigated),
    timeToResolve: since(startedAt, marks.resolved),
    customersAffected: Math.floor(incident.impact.customers),
  }
}

export function trend(value: number, previous: number): Trend {
  if (value < previous) return 'better'
  if (value > previous) return 'worse'
  return 'same'
}

/**
 * The scorecard (#16). `past` is the learner's own earlier runs, oldest first, and nobody else's:
 * the course compares a learner only with their past self. On a first run `past` is empty and each
 * row is just the number and what moves it.
 */
export function scorecard(
  incident: Incident,
  scoring: Record<ScoreMetric, ScoreExplainer>,
  past: readonly ScoreValues[] = []
): ScoreRow[] {
  const values = scoreValues(incident)
  return SCORE_METRICS.map((metric) => {
    const value = values[metric]
    const earlier = past.map((run) => run[metric]).filter((v): v is number => v !== undefined)
    const previous = earlier.at(-1)
    const row: ScoreRow = {
      metric,
      label: scoring[metric].label,
      value,
      moves: scoring[metric].moves,
    }
    if (previous === undefined) return row
    return {
      ...row,
      previous,
      best: Math.min(...earlier),
      ...(value === undefined ? {} : { trend: trend(value, previous) }),
    }
  })
}

/** "45s", "4m 10s", "1h 5m", from fake-clock ms. */
export function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    const rest = seconds % 60
    return rest ? `${minutes}m ${rest}s` : `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}
