import type { Decision, DecisionType } from '@sra/engine/decision'
import { DECISION_TYPES } from '@sra/engine/decision'
import type { StorageLike } from '../../progress/store'

/**
 * The learner's own finished runs of each decision scenario (#18), so the review can set a run next
 * to their earlier ones and nobody else's. A run is stored as its inputs, `{ scenario, seed,
 * decisions }`; everything shown is replayed from them, so a change to the model never needs a
 * migration here. Apart from course progress, like the incident history (`sra:incidents:v1`).
 */
export const SIMULATION_HISTORY_KEY = 'sra:simulations:v1'
/** Enough to compare a few strategies; old runs drop off first. */
export const MAX_SIMULATION_RUNS = 20

export interface SimulationRun {
  scenario: string
  seed: number
  decisions: Decision[]
  /** ISO timestamp, real time. */
  recordedAt: string
}

function isRun(value: unknown): value is SimulationRun {
  if (!value || typeof value !== 'object') return false
  const run = value as Partial<SimulationRun>
  return (
    typeof run.scenario === 'string' &&
    typeof run.seed === 'number' &&
    typeof run.recordedAt === 'string' &&
    Array.isArray(run.decisions) &&
    run.decisions.every(
      (d: unknown) =>
        Boolean(d) && DECISION_TYPES.includes((d as { type?: DecisionType }).type as DecisionType)
    )
  )
}

/** Every recorded run, oldest first. An unreadable history reads as empty rather than failing. */
export function loadSimulationRuns(storage: StorageLike | undefined): SimulationRun[] {
  try {
    const raw = storage?.getItem(SIMULATION_HISTORY_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isRun) : []
  } catch {
    return []
  }
}

/** Appends a run and returns the new history. A failed write keeps the run for this visit only. */
export function recordSimulationRun(
  storage: StorageLike | undefined,
  history: readonly SimulationRun[],
  run: SimulationRun
): SimulationRun[] {
  const next = [...history, run].slice(-MAX_SIMULATION_RUNS)
  try {
    storage?.setItem(SIMULATION_HISTORY_KEY, JSON.stringify(next))
  } catch {
    // Quota or privacy mode: the review still works for this visit.
  }
  return next
}
