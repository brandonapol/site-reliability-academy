// Decision simulations: turn-based runs where the learner trades reliability against features and
// money. The nines-versus-cost game (#18) is the first. See docs/design/nines-game.md.
export * from './types'
export {
  allowanceMinutes,
  decide,
  DECISION_TYPES,
  isFinished,
  legalDecisions,
  levelOf,
  MINUTES_PER_MONTH,
  nextNine,
  previousNine,
  replay,
  startRun,
  summarize,
} from './run'
