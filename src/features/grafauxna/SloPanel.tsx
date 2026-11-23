import { useMemo } from 'react'

import {
  attainment,
  errorBudget,
  burnRate,
  describeAllowedOutage,
  humanDuration,
} from '@sra/engine/telemetry'
import { CH8_SLO } from '@sra/engine/telemetry/__fixtures__/billingWeek'
import { useGame } from '../../store'
import styles from './Grafauxna.module.css'
import { useTelemetry } from './useTelemetry'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

interface Counts {
  good: number
  valid: number
}

/**
 * Good and valid checkouts between `from` and `to`, from the live series: traffic is requests per
 * minute, and the error rate says what share of them failed.
 */
function count(
  telemetry: ReturnType<typeof useTelemetry>,
  service: string,
  from: number,
  to: number,
  step: number
): Counts {
  const traffic = telemetry.series(service, 'traffic', from, to, step)
  const errors = telemetry.series(service, 'errorRate', from, to, step)
  let good = 0
  let valid = 0
  traffic.forEach((point, index) => {
    const requests = point.value * (step / MINUTE)
    valid += requests
    good += requests * (1 - (errors[index]?.value ?? 0) / 100)
  })
  return { good, valid }
}

/**
 * billing checkout's SLO, live (#32): the budget over the whole window, and how fast it's being
 * spent over the last 5 minutes and the last hour — the two windows the burn-rate page watches.
 * The window is sampled hourly, except the last hour, sampled each minute, so a fresh outage shows
 * up straight away.
 */
export function SloPanel() {
  const slo = CH8_SLO
  const telemetry = useTelemetry()
  const now = useGame((s) => s.game.clock.now)
  const minute = Math.floor(now / MINUTE) * MINUTE

  const { window, lastHour, lastFive } = useMemo(() => {
    const older = count(telemetry, slo.service, minute - slo.windowDays * DAY, minute - HOUR, HOUR)
    const hour = count(telemetry, slo.service, minute - HOUR + MINUTE, minute, MINUTE)
    const five = count(telemetry, slo.service, minute - 4 * MINUTE, minute, MINUTE)
    return {
      window: { good: older.good + hour.good, valid: older.valid + hour.valid },
      lastHour: hour,
      lastFive: five,
    }
  }, [telemetry, slo, minute])

  const attained = attainment(window.good, window.valid)
  const budget = errorBudget(slo.target, slo.windowDays, window.valid, window.good)
  const burn5 = burnRate(slo.target, lastFive.good, lastFive.valid)
  const burn60 = burnRate(slo.target, lastHour.good, lastHour.valid)
  const remainingPct = Math.max(
    0,
    Math.min(100, (budget.remainingEvents / budget.allowedEvents) * 100)
  )

  return (
    <div>
      <h1>SLOs</h1>
      <section className={styles.slo}>
        <h2>billing checkout</h2>
        <p>
          Target {(slo.target * 100).toFixed(1)}% of {slo.sli.valid} succeed. Currently{' '}
          {(attained * 100).toFixed(2)}% over the last {slo.windowDays} days.
        </p>
        <p>
          Error budget remaining: {humanDuration(Math.max(0, budget.remainingMinutes))}.{' '}
          {describeAllowedOutage(budget)}.
        </p>
        <div className={styles.gauge} aria-hidden="true">
          <span style={{ width: `${remainingPct}%` }} />
        </div>
        <p className={styles.summary}>
          Burn rate {burn5.toFixed(1)}× over the last 5 minutes, {burn60.toFixed(1)}× over the last
          hour (1 is “on pace”).
        </p>
      </section>
    </div>
  )
}
