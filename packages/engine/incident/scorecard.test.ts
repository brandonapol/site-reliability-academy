import { describe, expect, it } from 'vitest'

import { incidentContent } from './__fixtures__/incidentConfig'
import { formatDuration, scorecard, scoreValues, trend, type ScoreValues } from './scorecard'
import type { Incident } from './types'

const MINUTE = 60_000
const T = 1_000_000

function incident(overrides: Partial<Incident> = {}): Incident {
  return {
    service: 'billing',
    phase: 'resolved',
    startedAt: T,
    marks: {
      paged: T,
      acked: T + 2 * MINUTE,
      declared: T + 4 * MINUTE,
      mitigated: T + 8 * MINUTE,
      resolved: T + 120 * MINUTE,
    },
    timeline: [],
    impact: { customers: 432.9, sampledAt: T + 8 * MINUTE },
    statusPosts: [],
    ...overrides,
  }
}

describe('scoreValues', () => {
  it('measures MTTA from page to ack, and mitigate/resolve from the start of the incident', () => {
    expect(scoreValues(incident())).toEqual({
      mtta: 2 * MINUTE,
      timeToMitigate: 8 * MINUTE,
      timeToResolve: 120 * MINUTE,
      customersAffected: 432,
    })
  })

  it('leaves a number out when the incident never reached that point', () => {
    const values = scoreValues(
      incident({ phase: 'open', marks: { declared: T }, impact: { customers: 0, sampledAt: T } })
    )
    expect(values.mtta).toBeUndefined()
    expect(values.timeToMitigate).toBeUndefined()
    expect(values.timeToResolve).toBeUndefined()
    expect(values.customersAffected).toBe(0)
  })
})

describe('scorecard', () => {
  const run = (minutes: number, customers: number): ScoreValues => ({
    mtta: minutes * MINUTE,
    timeToMitigate: minutes * MINUTE,
    timeToResolve: undefined,
    customersAffected: customers,
  })

  it('on a first run shows each number and what moves it, with nothing to compare against', () => {
    const rows = scorecard(incident(), incidentContent.scoring)
    expect(rows.map((row) => [row.metric, row.label, row.moves])).toEqual([
      ['mtta', 'Time to acknowledge', 'mtta moves'],
      ['timeToMitigate', 'Time to mitigate', 'ttm moves'],
      ['timeToResolve', 'Time to resolve', 'ttr moves'],
      ['customersAffected', 'Customers affected', 'cust moves'],
    ])
    for (const row of rows) {
      expect(row).not.toHaveProperty('previous')
      expect(row).not.toHaveProperty('best')
      expect(row).not.toHaveProperty('trend')
    }
  })

  it('compares only with the learner’s own runs: the last one, and their best', () => {
    const rows = scorecard(incident(), incidentContent.scoring, [run(1, 900), run(5, 300)])
    expect(rows[0]).toMatchObject({
      value: 2 * MINUTE,
      previous: 5 * MINUTE,
      best: MINUTE,
      trend: 'better',
    })
    expect(rows[3]).toMatchObject({ value: 432, previous: 300, best: 300, trend: 'worse' })
  })

  it('skips earlier runs that never reached a number', () => {
    const rows = scorecard(incident(), incidentContent.scoring, [run(3, 100)])
    expect(rows[2]).not.toHaveProperty('previous')
  })

  it('has no trend for a number this run never reached, and never a pass/fail', () => {
    const rows = scorecard(incident({ marks: { paged: T } }), incidentContent.scoring, [
      run(3, 100),
    ])
    expect(rows[0]).toMatchObject({ previous: 3 * MINUTE })
    expect(rows[0]).not.toHaveProperty('trend')
    expect(rows.every((row) => !('pass' in row))).toBe(true)
  })

  it('reads lower as better for every number', () => {
    expect(trend(1, 2)).toBe('better')
    expect(trend(2, 2)).toBe('same')
    expect(trend(3, 2)).toBe('worse')
  })
})

describe('formatDuration', () => {
  it('reads like a person would say it', () => {
    expect(formatDuration(45_000)).toBe('45s')
    expect(formatDuration(4 * MINUTE + 10_000)).toBe('4m 10s')
    expect(formatDuration(30 * MINUTE)).toBe('30m')
    expect(formatDuration(65 * MINUTE)).toBe('1h 5m')
    expect(formatDuration(120 * MINUTE)).toBe('2h')
  })
})
