import { describe, expect, it } from 'vitest'

import { drawOutages } from './draw'
import {
  decide,
  legalDecisions,
  levelOf,
  replay,
  startRun,
  summarize,
  type Decision,
  type DecisionType,
  type Sourced,
} from '.'
import { NINES_HALF_YEAR as SCENARIO, SCENARIOS } from './scenarios'

const d = (...types: DecisionType[]): Decision[] => types.map((type) => ({ type }))

/** The four strategies in docs/design/nines-game.md → "What the model gives". */
const STRATEGIES = {
  shipAt999: d('ship', 'ship', 'ship', 'ship', 'ship', 'ship'),
  buy9999ThenShip: d('buyNine', 'hold', 'ship', 'ship', 'ship', 'ship'),
  buyUpTo99999: d('buyNine', 'hold', 'buyNine', 'hold', 'hold', 'hold'),
  promise100: d('promise100', 'hold', 'hold', 'hold', 'hold', 'hold'),
}

const SEEDS = Array.from({ length: 50 }, (_, i) => i + 1)

function run(decisions: Decision[], seed = 1) {
  return summarize(SCENARIO, replay(SCENARIO, seed, decisions))
}

describe('a decision run', () => {
  it('is the same for the same seed and the same decisions', () => {
    for (const decisions of Object.values(STRATEGIES)) {
      expect(replay(SCENARIO, 7, decisions)).toEqual(replay(SCENARIO, 7, decisions))
    }
  })

  it('changes with the seed', () => {
    const minutes = SEEDS.map((seed) => run(STRATEGIES.shipAt999, seed).downtimeMinutes)
    expect(new Set(minutes).size).toBeGreaterThan(SEEDS.length / 2)
  })

  it('keeps a later month’s luck when an earlier choice changes, at the same level', () => {
    const a = replay(SCENARIO, 3, d('ship', 'ship', 'ship', 'ship'))
    const b = replay(SCENARIO, 3, d('dropNine', 'buyNine', 'ship', 'ship'))
    expect(b.reports[3].level).toBe(a.reports[3].level)
    expect(b.reports[3].downtimeMinutes).toBe(a.reports[3].downtimeMinutes)
  })

  it('rejects a decision that is not legal', () => {
    const building = replay(SCENARIO, 1, d('buyNine'))
    expect(legalDecisions(SCENARIO, building).map((x) => x.type)).toEqual(['hold', 'promise100'])
    expect(() => decide(SCENARIO, building, { type: 'ship' })).toThrow(/not a legal decision/)
    expect(() => decide(SCENARIO, startRun(SCENARIO, 1), { type: 'hold' })).toThrow()
  })

  it('ends after the scenario’s months', () => {
    const done = replay(SCENARIO, 1, STRATEGIES.shipAt999)
    expect(legalDecisions(SCENARIO, done)).toEqual([])
    expect(summarize(SCENARIO, done).finished).toBe(true)
  })
})

describe('the nines model', () => {
  it('has a mean downtime in shipping months close to each level’s allowance', () => {
    for (const level of SCENARIO.levels.filter((l) => !l.promise)) {
      const keys = Array.from({ length: 4000 }, (_, i) => `${i}:${level.id}:true`)
      const mean =
        keys.reduce(
          (total, key) => total + drawOutages(key, level.downtimeWithChange.value).minutes,
          0
        ) / keys.length
      const allowance = (1 - level.target) * 43_200
      expect(Math.abs(mean - allowance) / allowance, level.id).toBeLessThan(0.05)
    }
  })

  it('puts shipping at 99.9% ahead of buying 99.99%, which beats buying 99.999%, then promising 100%', () => {
    for (const seed of SEEDS) {
      const [ship, buy4, buy5, promise] = Object.values(STRATEGIES).map(
        (decisions) => run(decisions, seed).profit
      )
      expect(ship, `seed ${seed}`).toBeGreaterThan(buy4)
      expect(buy4, `seed ${seed}`).toBeGreaterThan(buy5)
      expect(buy5, `seed ${seed}`).toBeGreaterThan(promise)
    }
  })

  it('ends the 99.999% and 100% runs with a loss, and the 99.9% run with a profit', () => {
    for (const seed of SEEDS) {
      expect(run(STRATEGIES.shipAt999, seed).profit).toBeGreaterThan(0)
      expect(run(STRATEGIES.buyUpTo99999, seed).profit).toBeLessThan(0)
      expect(run(STRATEGIES.promise100, seed).profit).toBeLessThan(0)
    }
  })

  it('ships fewer features for every nine bought', () => {
    const shipped = Object.values(STRATEGIES).map((decisions) => run(decisions).shipped.length)
    expect(shipped).toEqual([6, 4, 0, 0])
  })

  it('never delivers 100%, even when it is promised, and freezes shipping', () => {
    for (const seed of SEEDS) {
      const state = replay(SCENARIO, seed, STRATEGIES.promise100.slice(0, 3))
      expect(legalDecisions(SCENARIO, state)).toEqual([{ type: 'hold' }])
      const summary = run(STRATEGIES.promise100, seed)
      expect(summary.delivered).toBeLessThan(1)
      expect(summary.downtimeMinutes).toBeGreaterThan(0)
    }
  })

  it('shows the users’ own side failing more than Inkwell at 99.99% and up', () => {
    for (const seed of SEEDS) {
      for (const decisions of [STRATEGIES.buy9999ThenShip, STRATEGIES.buyUpTo99999]) {
        for (const report of replay(SCENARIO, seed, decisions).reports) {
          expect(report.failedVisitsOwnSide).toBeGreaterThan(report.failedVisitsInkwell)
        }
      }
    }
  })

  it('says in the ledger that the fifth nine and the 100% promise cost more than they returned', () => {
    const fifth = run(STRATEGIES.buyUpTo99999).ledger.find((row) => row.level === '99.999')
    expect(fifth!.cost).toBeGreaterThan(fifth!.saved)
    const promise = run(STRATEGIES.promise100).ledger.find((row) => row.level === '100')
    expect(promise!.featuresForgone).toBe(6)
    expect(promise!.cost).toBeGreaterThan(promise!.saved)
  })

  it('lists no ledger rows for a run that never buys a nine', () => {
    expect(run(STRATEGIES.shipAt999).ledger).toEqual([])
  })
})

describe('the scenarios', () => {
  function sourced(scenario: (typeof SCENARIOS)[number]): Array<[string, Sourced]> {
    return [
      ...Object.entries(scenario.economy),
      ...scenario.levels.flatMap((level) =>
        (['teamMonths', 'runningCost', 'downtimeWithChange'] as const).map(
          (field) => [`${level.id}.${field}`, level[field]] as [string, Sourced]
        )
      ),
      ...scenario.events.map((event) => [event.id, event.downtimeMinutes] as [string, Sourced]),
    ]
  }

  for (const scenario of SCENARIOS) {
    it(`${scenario.id} labels every number with a source or an assumption`, () => {
      for (const [name, figure] of sourced(scenario)) {
        expect(typeof figure.value, name).toBe('number')
        const label = 'source' in figure ? figure.source : figure.assumption
        expect(label.trim().length, name).toBeGreaterThan(0)
        if ('source' in figure) expect(figure.source, name).toMatch(/^https:\/\//)
      }
    })

    it(`${scenario.id} names real levels and has enough roadmap for every month`, () => {
      expect(levelOf(scenario, scenario.start.level)).toBeDefined()
      expect(scenario.roadmap.length).toBeGreaterThanOrEqual(scenario.turns)
      for (const option of scenario.keep?.options ?? []) levelOf(scenario, option.level)
      expect(scenario.levels.filter((level) => level.promise).length).toBeLessThanOrEqual(1)
    })

    it(`${scenario.id} has a line for every reaction a run can pick`, () => {
      for (const decisions of Object.values(STRATEGIES)) {
        for (const report of replay(scenario, 1, decisions).reports) {
          expect(scenario.lines[report.reaction], report.reaction).toBeDefined()
        }
      }
    })
  }
})
