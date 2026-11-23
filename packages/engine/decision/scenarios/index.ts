import type { DecisionScenario } from '../types'
import { NINES_HALF_YEAR } from './ninesHalfYear'

export { NINES_HALF_YEAR }

/** Every decision scenario, by id. Lessons name one in `do.scenario`; the course validator checks it. */
export const SCENARIOS: readonly DecisionScenario[] = [NINES_HALF_YEAR]

export function findScenario(id: string): DecisionScenario | undefined {
  return SCENARIOS.find((scenario) => scenario.id === id)
}
