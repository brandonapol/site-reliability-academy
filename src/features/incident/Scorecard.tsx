import {
  formatDuration,
  scorecard,
  type Incident,
  type ScoreRow,
  type Trend,
} from '@sra/engine/incident'
import { useGame } from '../../store'
import styles from './Incident.module.css'

const TREND_LABEL: Record<Trend, string> = {
  better: 'Better than last time',
  same: 'Same as last time',
  worse: 'Slower than last time',
}

function format(row: ScoreRow, value: number): string {
  return row.metric === 'customersAffected' ? value.toLocaleString('en-US') : formatDuration(value)
}

function trendLabel(row: ScoreRow): string | undefined {
  if (!row.trend) return undefined
  if (row.metric === 'customersAffected') {
    return {
      better: 'Fewer than last time',
      same: 'Same as last time',
      worse: 'More than last time',
    }[row.trend]
  }
  return TREND_LABEL[row.trend]
}

/**
 * How the incident went (#16). The only comparison is with the learner's own earlier runs of this
 * incident, never with "a typical team" or other learners (spec section 7). A first run shows each
 * number and what moves it, with nothing to measure it against. No pass or fail.
 */
export function Scorecard({ incident }: { incident: Incident }) {
  const scoring = useGame((s) => s.config.incident?.scoring)
  const past = useGame((s) => s.incidentPast)
  if (!scoring) return null
  const rows = scorecard(incident, scoring, past ?? [])
  const firstRun = rows.every((row) => row.previous === undefined)
  return (
    <section className={styles.scorecard} aria-label="Scorecard">
      <h3 className={styles.scorecardTitle}>Scorecard</h3>
      <p className={styles.scorecardIntro}>
        {firstRun
          ? 'Your first run of this incident. Replay it and this card compares you with this run: only ever with yourself.'
          : 'Compared with your own earlier runs of this incident, and nobody else’s.'}
      </p>
      <table className={styles.scoreTable}>
        <thead>
          <tr>
            <th scope="col">Measure</th>
            <th scope="col">This run</th>
            {!firstRun && <th scope="col">Your last run</th>}
            {!firstRun && <th scope="col">Your best</th>}
            <th scope="col">What moves it</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.metric}>
              <th scope="row">{row.label}</th>
              <td>
                {row.value === undefined ? 'Not reached' : format(row, row.value)}
                {trendLabel(row) && <span className={styles.band}>{trendLabel(row)}</span>}
              </td>
              {!firstRun && <td>{row.previous === undefined ? '—' : format(row, row.previous)}</td>}
              {!firstRun && <td>{row.best === undefined ? '—' : format(row, row.best)}</td>}
              <td>{row.moves}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
