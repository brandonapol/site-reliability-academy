import type { ScoreValues } from '@sra/engine/incident'
import type { StorageLike } from './persistence'

/**
 * The learner's own incident runs (#16), so the scorecard can compare a run with their earlier
 * ones and nobody else's. Kept under its own key, apart from the game save: "Restart chapter" and
 * a `?chapter=` jump replace the save, and the history has to outlive both.
 */
export const INCIDENT_HISTORY_KEY = 'sra:incidents:v1'
/** Enough to show a trend; old runs drop off first. */
export const MAX_INCIDENT_RUNS = 20

export interface IncidentRun {
  chapterId: string
  /** ISO timestamp, real time. */
  recordedAt: string
  values: ScoreValues
}

const METRICS = ['mtta', 'timeToMitigate', 'timeToResolve', 'customersAffected'] as const

function isRun(value: unknown): value is IncidentRun {
  if (!value || typeof value !== 'object') return false
  const run = value as Partial<IncidentRun>
  if (typeof run.chapterId !== 'string' || typeof run.recordedAt !== 'string') return false
  if (!run.values || typeof run.values !== 'object') return false
  const values = run.values as Record<string, unknown>
  return METRICS.every((m) => values[m] === undefined || typeof values[m] === 'number')
}

/** Every recorded run, oldest first. An unreadable history reads as empty rather than failing. */
export function loadIncidentHistory(storage: StorageLike | undefined): IncidentRun[] {
  try {
    const raw = storage?.getItem(INCIDENT_HISTORY_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isRun) : []
  } catch {
    return []
  }
}

/** Appends a run and returns the new history. A failed write keeps the run for this visit only. */
export function recordIncidentRun(
  storage: StorageLike | undefined,
  history: readonly IncidentRun[],
  run: IncidentRun
): IncidentRun[] {
  const next = [...history, run].slice(-MAX_INCIDENT_RUNS)
  try {
    storage?.setItem(INCIDENT_HISTORY_KEY, JSON.stringify(next))
  } catch {
    // Quota or privacy mode: the scorecard still works for this visit.
  }
  return next
}

/** The learner's runs of one chapter before the latest, as the scorecard compares against them. */
export function pastRuns(history: readonly IncidentRun[], chapterId: string): ScoreValues[] {
  return history.filter((run) => run.chapterId === chapterId).map((run) => run.values)
}
