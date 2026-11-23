import { useEffect, useId, useRef, useState, type Ref } from 'react'

import {
  allowanceMinutes,
  decide,
  isFinished,
  legalDecisions,
  levelOf,
  nextNine,
  previousNine,
  replay,
  startRun,
  summarize,
  type Decision,
  type DecisionScenario,
  type DecisionType,
  type KeepOption,
  type Line,
  type RunState,
  type RunSummary,
  type TurnReport,
} from '@sra/engine/decision'
import { characters } from '../../content/characters'
import type { StorageLike } from '../../progress/store'
import { Avatar } from '../shared/Avatar'
import { count, delivered, minutes, money, plural, target } from './format'
import { loadSimulationRuns, recordSimulationRun, type SimulationRun } from './history'
import styles from './Nines.module.css'

/** Replaying uses the same seed by default, so two strategies meet the same luck. */
const FIRST_SEED = 1

interface NinesGameProps {
  scenario: DecisionScenario
  /** Where earlier runs are kept. Undefined keeps them for this visit only. */
  storage: StorageLike | undefined
  /** The learner chose an SLO at the end of a run: the target as a fraction, e.g. 0.999. */
  onKeep: (target: number) => void
}

/**
 * The nines-versus-cost game (#18), on the lesson page. Turn-based: one card a month, a report card
 * after each, Morgan's review at the end, then Kai asks for the SLO that becomes the week's Keep.
 * See docs/design/nines-game.md.
 */
export function NinesGame({ scenario, storage, onKeep }: NinesGameProps) {
  const [state, setState] = useState(() => startRun(scenario, FIRST_SEED))
  const [confirming100, setConfirming100] = useState(false)
  const [history, setHistory] = useState(() => loadSimulationRuns(storage))
  const [reply, setReply] = useState<KeepOption>()
  const focusTarget = useRef<HTMLHeadingElement>(null)
  const finished = isFinished(scenario, state)
  const last = state.reports.at(-1)

  // After each month, move focus to what changed: the report card, or the review at the end.
  useEffect(() => {
    if (state.turn > 0) focusTarget.current?.focus()
  }, [state.turn])

  function play(decision: Decision) {
    const next = decide(scenario, state, decision)
    setState(next)
    setConfirming100(false)
    if (isFinished(scenario, next)) {
      const run = {
        scenario: scenario.id,
        seed: next.seed,
        decisions: next.decisions,
        recordedAt: new Date().toISOString(),
      }
      setHistory((current) => recordSimulationRun(storage, current, run))
    }
  }

  function restart(seed: number) {
    setState(startRun(scenario, seed))
    setConfirming100(false)
    setReply(undefined)
  }

  function choose(option: KeepOption) {
    setReply(option)
    if (option.accepted) onKeep(levelOf(scenario, option.level).target)
  }

  const level = levelOf(scenario, state.level)

  return (
    <div className={styles.game}>
      <Message line={scenario.lines.intro} />
      <p className={styles.status}>
        {finished
          ? `All ${scenario.turns} months played`
          : `Month ${state.turn + 1} of ${scenario.turns}`}
        {' · '}Target {level.label}
        {' · '}Error budget {minutes(allowanceMinutes(level))} a month
      </p>

      {last && (
        <ReportCard
          scenario={scenario}
          state={state}
          report={last}
          headingRef={finished ? undefined : focusTarget}
        />
      )}

      {finished ? (
        <Review
          scenario={scenario}
          state={state}
          history={history}
          headingRef={focusTarget}
          reply={reply}
          onRestart={restart}
          onChoose={choose}
        />
      ) : confirming100 ? (
        <section className={styles.card} aria-labelledby="nines-promise">
          <h3 id="nines-promise">Promise 100%?</h3>
          <Message line={scenario.lines.promiseWarning} />
          <p className={styles.actions}>
            <button type="button" className="button" onClick={() => play({ type: 'promise100' })}>
              Promise 100% anyway
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setConfirming100(false)}
            >
              Back to the choices
            </button>
          </p>
        </section>
      ) : (
        <Choices
          scenario={scenario}
          state={state}
          onChoose={(decision) =>
            decision.type === 'promise100' ? setConfirming100(true) : play(decision)
          }
        />
      )}
    </div>
  )
}

function Message({ line }: { line: Line | undefined }) {
  if (!line) return null
  const who = characters[line.speaker]
  const name = who?.name ?? line.speaker
  return (
    <div className={styles.message}>
      <Avatar name={name} character={who} size={32} />
      <p>
        <strong>{name}:</strong> {line.text}
      </p>
    </div>
  )
}

const CARD_ORDER: DecisionType[] = ['hold', 'ship', 'buyNine', 'dropNine', 'promise100']

function Choices({
  scenario,
  state,
  onChoose,
}: {
  scenario: DecisionScenario
  state: RunState
  onChoose: (decision: Decision) => void
}) {
  const legal = new Set(legalDecisions(scenario, state).map((decision) => decision.type))
  const descriptionId = useId()
  const next = nextNine(scenario, state)
  const below = previousNine(scenario, state)
  const building = state.building ? levelOf(scenario, state.building) : undefined
  const feature = scenario.roadmap[state.shipped.length]

  // Why a card can't be played this month, when it can't.
  const blocked = state.promised
    ? scenario.lines.frozenCard?.text
    : building
      ? `The team is building ${building.label}: ${plural(state.busyMonths, 'more month')}.`
      : undefined

  const details: Record<DecisionType, string> = {
    hold: state.promised
      ? 'Nothing ships. That was the promise.'
      : building
        ? `The team keeps building ${building.label}: ${plural(state.busyMonths, 'more month')}.`
        : '',
    ship: feature
      ? `Next up: ${feature.name}. ${scenario.cards.ship.description}`
      : 'The roadmap is done.',
    buyNine: next
      ? `${next.label}: ${next.buys} Takes ${plural(next.teamMonths.value, 'team-month')} and ${money(next.runningCost.value)} a month to run. Error budget ${minutes(allowanceMinutes(next))} a month. ${scenario.cards.buyNine.description}`
      : 'There is no nine left to buy. Only a promise.',
    dropNine: below
      ? `${below.label}: ${money(below.runningCost.value)} a month to run, error budget ${minutes(allowanceMinutes(below))} a month. ${scenario.cards.dropNine.description}`
      : 'There is no lower target.',
    promise100: state.promised ? 'Already promised.' : scenario.cards.promise100.description,
  }

  const cards = CARD_ORDER.filter((type) => type !== 'hold' || legal.has('hold'))

  return (
    <section className={styles.card} aria-labelledby="nines-month">
      <h3 id="nines-month">
        Month {state.turn + 1} of {scenario.turns}
      </h3>
      <Message line={scenario.lines.ask} />
      <ul className={styles.choices}>
        {cards.map((type) => {
          const enabled = legal.has(type)
          const id = `${descriptionId}-${type}`
          return (
            <li key={type} className={styles.choice}>
              <button
                type="button"
                className={type === 'hold' ? 'button' : 'button button-secondary'}
                disabled={!enabled}
                aria-describedby={id}
                onClick={() => onChoose({ type })}
              >
                {scenario.cards[type].title}
              </button>
              <p id={id} className={styles.choiceDetail}>
                {!enabled && blocked && type !== 'promise100' ? blocked : details[type]}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function ReportCard({
  scenario,
  state,
  report,
  headingRef,
}: {
  scenario: DecisionScenario
  state: RunState
  report: TurnReport
  headingRef?: Ref<HTMLHeadingElement>
}) {
  const total = summarize(scenario, state)
  const feature = scenario.roadmap.find((f) => f.id === report.shipped)
  const id = useId()
  return (
    <section className={styles.card} aria-labelledby={id}>
      <h3 id={id} ref={headingRef} tabIndex={-1}>
        Month {report.turn + 1} report
      </h3>
      <Message line={scenario.lines[report.reaction]} />
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <caption className="visually-hidden">Month {report.turn + 1}, and the run so far</caption>
          <thead>
            <tr>
              <td />
              <th scope="col">This month</th>
              <th scope="col">So far</th>
            </tr>
          </thead>
          <tbody>
            <Row label="Revenue" now={money(report.revenue)} sofar={money(total.revenue)} />
            <Row
              label="Reliability running cost"
              now={money(report.runningCost)}
              sofar={money(total.runningCost)}
            />
            <Row
              label="Lost to downtime"
              now={money(report.lostCheckouts)}
              sofar={money(total.lostCheckouts)}
            />
            <Row label="Profit" now={money(report.profit)} sofar={money(total.profit)} strong />
            <Row
              label="Features shipped"
              now={feature ? feature.name : 'None'}
              sofar={`${total.shipped.length} of ${scenario.roadmap.length}`}
            />
            <Row
              label="Downtime"
              now={minutes(report.downtimeMinutes)}
              sofar={minutes(total.downtimeMinutes)}
            />
            <Row
              label="Error budget"
              now={minutes(report.allowanceMinutes)}
              sofar={minutes(total.allowanceMinutes)}
            />
            <Row
              label="Visits that failed because of Inkwell"
              now={count(report.failedVisitsInkwell)}
              sofar={count(total.failedVisitsInkwell)}
            />
            <Row
              label="Visits that failed on the user’s own phone or Wi-Fi"
              now={count(report.failedVisitsOwnSide)}
              sofar={count(total.failedVisitsOwnSide)}
            />
            <Row
              label="Cancellations (our weakest guess)"
              now={count(report.cancellations)}
              sofar={count(total.cancellations)}
            />
          </tbody>
        </table>
      </div>
      <Bars inkwell={report.failedVisitsInkwell} own={report.failedVisitsOwnSide} />
      <p className={styles.note}>Inkwell’s numbers are made up. The shape is real.</p>
    </section>
  )
}

function Row({
  label,
  now,
  sofar,
  strong,
}: {
  label: string
  now: string
  sofar: string
  strong?: boolean
}) {
  return (
    <tr className={strong ? styles.strong : undefined}>
      <th scope="row">{label}</th>
      <td>{now}</td>
      <td>{sofar}</td>
    </tr>
  )
}

/** Failed visits this month, side by side. The numbers are in the table above; this is the picture. */
function Bars({ inkwell, own }: { inkwell: number; own: number }) {
  const max = Math.max(inkwell, own, 1)
  return (
    <div className={styles.bars} aria-hidden="true">
      <p className={styles.barsTitle}>Who noticed this month</p>
      {[
        { label: 'Because of Inkwell', value: inkwell, className: styles.barInkwell },
        { label: 'Their own phone or Wi-Fi', value: own, className: styles.barOwn },
      ].map(({ label, value, className }) => (
        <div key={label} className={styles.barRow}>
          <span className={styles.barLabel}>{label}</span>
          <span className={styles.barTrack}>
            <span
              className={`${styles.bar} ${className}`}
              style={{ width: `${Math.max(1, (value / max) * 100)}%` }}
            />
          </span>
          <span className={styles.barValue}>{count(value)}</span>
        </div>
      ))}
    </div>
  )
}

function Review({
  scenario,
  state,
  history,
  headingRef,
  reply,
  onRestart,
  onChoose,
}: {
  scenario: DecisionScenario
  state: RunState
  history: readonly SimulationRun[]
  headingRef: Ref<HTMLHeadingElement>
  reply: KeepOption | undefined
  onRestart: (seed: number) => void
  onChoose: (option: KeepOption) => void
}) {
  const summary = summarize(scenario, state)
  const runs = pastRuns(scenario, history)
  const keep = scenario.keep

  return (
    <section className={styles.card} aria-labelledby="nines-review">
      <h3 id="nines-review" ref={headingRef} tabIndex={-1}>
        Morgan’s review
      </h3>
      <Message line={scenario.lines.review} />

      {summary.promised && (
        <p className={styles.endCard}>
          <strong>
            Promised 100%. Delivered {delivered(summary.delivered)}. Spent{' '}
            {money(summary.runningCost)} on reliability. Shipped{' '}
            {summary.shipped.length === 0
              ? 'nothing'
              : `${plural(summary.shipped.length, 'feature')}, all before the promise`}
            .
          </strong>{' '}
          Your users’ own Wi-Fi failed them about {count(summary.failedVisitsOwnSide)} times.
        </p>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <caption>The run, in total</caption>
          <tbody>
            <Total label="Profit" value={money(summary.profit)} />
            <Total
              label="Features shipped"
              value={
                summary.shipped.length
                  ? summary.shipped
                      .map((id) => scenario.roadmap.find((f) => f.id === id)?.name)
                      .join(', ')
                  : 'None'
              }
            />
            <Total
              label="Downtime"
              value={`${minutes(summary.downtimeMinutes)} (budget ${minutes(summary.allowanceMinutes)})`}
            />
            <Total label="Availability delivered" value={delivered(summary.delivered)} />
            <Total
              label="Visits that failed because of Inkwell"
              value={count(summary.failedVisitsInkwell)}
            />
            <Total
              label="Visits that failed on the user’s own phone or Wi-Fi"
              value={count(summary.failedVisitsOwnSide)}
            />
          </tbody>
        </table>
      </div>

      <h4>What each nine cost</h4>
      {summary.ledger.length === 0 ? (
        <p>You bought no nines this run, so there is nothing to weigh.</p>
      ) : (
        <>
          <p className={styles.note}>
            Cost is the extra running cost plus the features the team didn’t ship while building it,
            priced at the revenue they would have brought. Saved is the lost checkouts and
            cancellations it avoided.
          </p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className="visually-hidden">What each nine cost and saved</caption>
              <thead>
                <tr>
                  <th scope="col">Nine</th>
                  <th scope="col">Cost</th>
                  <th scope="col">Saved</th>
                  <th scope="col">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {summary.ledger.map((row) => (
                  <tr key={row.level}>
                    <th scope="row">{levelOf(scenario, row.level).label}</th>
                    <td>{money(row.cost)}</td>
                    <td>{money(row.saved)}</td>
                    <td>
                      {row.cost > row.saved
                        ? 'Cost more than it returned'
                        : 'Returned more than it cost'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h4>Your runs</h4>
      <p className={styles.note}>
        Only your own runs, oldest first. Playing again uses the same luck, so two plans meet the
        same months.
      </p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <caption className="visually-hidden">Your runs of this game</caption>
          <thead>
            <tr>
              <th scope="col">Run</th>
              <th scope="col">Ended at</th>
              <th scope="col">Features</th>
              <th scope="col">Downtime</th>
              <th scope="col">Profit</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run, index) => (
              <tr key={index}>
                <th scope="row">{index === runs.length - 1 ? 'This run' : index + 1}</th>
                <td>{levelOf(scenario, run.finalLevel).label}</td>
                <td>{run.shipped.length}</td>
                <td>{minutes(run.downtimeMinutes)}</td>
                <td>{money(run.profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.actions}>
        <button
          type="button"
          className="button button-secondary"
          onClick={() => onRestart(state.seed)}
        >
          Play again with the same luck
        </button>
        <button
          type="button"
          className="button button-secondary"
          onClick={() => onRestart(state.seed + 1)}
        >
          Play again with new luck
        </button>
      </p>

      {keep && (
        <section aria-labelledby="nines-keep" className={styles.keep}>
          <h4 id="nines-keep">Your first SLO</h4>
          <Message line={keep.question} />
          <p>
            The SLI: {keep.sli.toLowerCase()}, measured over {keep.windowDays} days. Pick the
            target.
          </p>
          <ul className={styles.targets}>
            {keep.options.map((option) => (
              <li key={option.level}>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => onChoose(option)}
                >
                  {levelOf(scenario, option.level).label}
                </button>
              </li>
            ))}
          </ul>
          <div role="status">
            {reply && (
              <>
                <Message line={reply.reply} />
                {reply.accepted && (
                  <p>
                    Saved as your first SLO:{' '}
                    <strong>{target(levelOf(scenario, reply.level).target)}</strong>. It’s in Keep,
                    below.
                  </p>
                )}
              </>
            )}
          </div>
        </section>
      )}
    </section>
  )
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>{value}</td>
    </tr>
  )
}

/** The learner's finished runs of this scenario, replayed from their decisions. A run the current
 * scenario can no longer replay (its rules changed) is skipped rather than shown wrong. */
function pastRuns(scenario: DecisionScenario, history: readonly SimulationRun[]): RunSummary[] {
  return history
    .filter((run) => run.scenario === scenario.id)
    .flatMap((run) => {
      try {
        const summary = summarize(scenario, replay(scenario, run.seed, run.decisions))
        return summary.finished ? [summary] : []
      } catch {
        return []
      }
    })
}
