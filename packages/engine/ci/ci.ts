import type { CiState, Pipeline } from './types'

/** An empty CI world: no pipelines have run yet. */
export function createCiState(): CiState {
  return { pipelines: {}, nextId: 0 }
}

export function findPipeline(ci: CiState, id: string): Pipeline | undefined {
  return ci.pipelines[id]
}

/** The pipeline scheduled for a PR, if any — what the Checks tab looks up by `pr.pipelineId`. */
/**
 * The PR's current checks: its most recent pipeline. A fix ("Suggest a fix" → fix the code)
 * schedules a new pipeline for the same PR, and the old one, with its failed run, must not keep
 * standing in for it, or the PR page would show the stale result with nothing left to re-run.
 */
export function pipelineForPR(ci: CiState, prId: string): Pipeline | undefined {
  return Object.values(ci.pipelines)
    .filter((pipeline) => pipeline.prId === prId)
    .at(-1)
}
