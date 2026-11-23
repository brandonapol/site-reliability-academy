import { describe, expect, it } from 'vitest'

import { blankState, startChapter, type Action, type GameState } from '@sra/engine/game'
import { scoreValues, type TimelineKind } from '@sra/engine/incident'
import { flushEffects, play, playChapter, playChapterRecoverably } from '@sra/engine/story/harness'
import { currentStep } from '@sra/engine/story/runner'
import { createGameConfig } from '../config'

const config = createGameConfig()

describe('chapters', () => {
  it('Ch 0 golden path and recoverability', () => {
    const { state, trace } = playChapter(config, '00-welcome')
    expect(state.story.phase).toBe('complete')
    expect(state.player.name).toBe('Ada Lovelace')
    expect(trace).toContain('say-hello')
    expect(trace).toContain('the-job')
    expect(state.ui.unlockedTabs).toEqual(expect.arrayContaining(['flack', 'inkwell', 'arghcd']))

    const recovered = playChapterRecoverably(config, '00-welcome')
    expect(recovered.state.story.phase).toBe('complete')
  })

  it('Ch 1 golden path and recoverability', () => {
    const { state, trace } = playChapter(config, '01-boxes')
    expect(state.story.phase).toBe('complete')
    expect(trace).toContain('open-search')
    expect(trace).toContain('reply-robin')
    expect(playChapterRecoverably(config, '01-boxes').state.story.phase).toBe('complete')
  })

  it('Ch 2 golden path and recoverability', () => {
    const { state, trace } = playChapter(config, '02-order-form')
    expect(state.story.phase).toBe('complete')
    expect(state.cluster.wishes.search?.copies).toBe(3)
    expect(trace).toContain('make-it-so')
    expect(trace).toContain('watch-has')
    expect(playChapterRecoverably(config, '02-order-form').state.story.phase).toBe('complete')
  })

  it('Ch 3 golden path', () => {
    const { state, trace } = playChapter(config, '03-self-heal')
    expect(state.story.phase).toBe('complete')
    expect(trace).toEqual(['unplug', 'box-off', 'scale-up'])
    expect(state.cluster.wishes.search?.copies).toBe(5)
    expect(state.cluster.boxes.find((box) => box.id === 'box-b')?.on).toBe(false)
  })

  it('Ch 4 golden path', () => {
    const { state, trace } = playChapter(config, '04-gitops')
    expect(state.story.phase).toBe('complete')
    expect(trace).toContain('propose-web')
    expect(trace).toContain('merge-it')
    expect(state.gitops.deployRepo.wishes.web?.version).toBe('2.0')
  })

  it('Ch 5 golden path', () => {
    const { state, trace } = playChapter(config, '05-ci')
    expect(state.story.phase).toBe('complete')
    expect(trace).toContain('run-e2e')
    expect(trace).toContain('what-wrong')
    expect(trace).toContain('suggest-fix')
    expect(trace).toContain('merge-fix')
    expect(state.gitops.pullRequests[0].status).toBe('merged')
  })

  it('week-one wrap golden path', () => {
    const { state } = playChapter(config, '06-wrap')
    expect(state.story.phase).toBe('complete')
    expect(playChapterRecoverably(config, '06-wrap').state.story.phase).toBe('complete')
  })

  it('Ch 6 golden path', () => {
    const { state } = playChapter(config, 'ch6-seeing-inside')
    expect(state.story.phase).toBe('complete')
    expect(state.ui.unlockedTabs).toContain('grafauxna')
  })

  it('Ch 7 golden path', () => {
    const { state, trace } = playChapter(config, 'ch7-slo')
    expect(state.story.phase).toBe('complete')
    expect(trace).toEqual(['open-slos', 'choose-sli', 'choose-target', 'budget-policy'])
    expect(playChapterRecoverably(config, 'ch7-slo').state.story.phase).toBe('complete')
  })

  it('Ch 8 golden path', () => {
    const { state } = playChapter(config, 'ch8-alerts')
    expect(state.story.phase).toBe('complete')
    expect(playChapterRecoverably(config, 'ch8-alerts').state.story.phase).toBe('complete')
  })

  it('bonus traffic spike golden path', () => {
    const { state } = playChapter(config, 'bonus-traffic')
    expect(state.story.phase).toBe('complete')
    expect(state.gitops.deployRepo.wishes.web?.copies).toBe(6)
  })

  it('bonus database upgrade golden path', () => {
    const { state } = playChapter(config, 'bonus-database')
    expect(state.story.phase).toBe('complete')
    expect(playChapterRecoverably(config, 'bonus-database').state.story.phase).toBe('complete')
  })

  it('?chapter=00 jump builds a starting world', () => {
    const { state } = playChapter(config, '00-welcome')
    expect(state.cluster.boxes.length).toBeGreaterThan(0)
    expect(state.gitops.deployRepo.wishes.web).toMatchObject({ version: '1.8', copies: 3 })
  })

  describe('Ch 9: the page', () => {
    /** Everything Ch 10's write-up reads off the timeline, in the order it has to happen. */
    const TIMELINE_ORDER: TimelineKind[] = [
      'paged',
      'acked',
      'declared',
      'hypothesisChecked',
      'mitigationChosen',
      'rollbackStarted',
      'recovered',
      'statusPosted',
      'resolved',
    ]

    function expectCompleteTimeline(state: GameState) {
      const incident = state.incident.current!
      expect(incident.phase).toBe('resolved')
      const kinds = incident.timeline.map((entry) => entry.kind)
      for (const kind of TIMELINE_ORDER) expect(kinds, kind).toContain(kind)
      const firsts = TIMELINE_ORDER.map((kind) => kinds.indexOf(kind))
      // statusPosted happens throughout (investigating comes right after declaring), so check the
      // rest are in order.
      const ordered = firsts.filter((_, i) => TIMELINE_ORDER[i] !== 'statusPosted')
      expect(ordered).toEqual([...ordered].sort((a, b) => a - b))
      expect(kinds.filter((kind) => kind === 'hypothesisChecked')).toHaveLength(4)
      expect(incident.statusPosts.map((post) => post.stage)).toEqual([
        'investigating',
        'identified',
        'monitoring',
        'resolved',
      ])
      for (let i = 1; i < incident.timeline.length; i++) {
        expect(incident.timeline[i].at).toBeGreaterThanOrEqual(incident.timeline[i - 1].at)
      }
      expect(incident.declaration?.channelId).toBe('inc-1-checkout')
      for (const mark of ['paged', 'acked', 'declared', 'mitigated', 'resolved'] as const) {
        expect(incident.marks[mark], mark).toBeDefined()
      }
    }

    it('golden path: page, ack, investigate, revert, verify, communicate, resolve', () => {
      const { state, trace } = playChapter(config, '09-the-page')
      expect(state.story.phase).toBe('complete')
      expect(trace).toEqual([
        'on-call',
        'ack',
        'open-dashboard',
        'is-it-real',
        'slo-burn',
        'reproduce',
        'declare',
        'take-ops',
        'h-traffic',
        'h-box',
        'h-provider',
        'h-deploy',
        'stop-bleeding',
        'revert',
        'sync',
        'verify-checkout',
        'verify-signals',
        'post-update',
        'all-clear',
        'resolve',
      ])
      expect(state.gitops.deployRepo.wishes.billing?.version).toBe('2.4.0')
      expect(state.cluster.wishes.billing?.version).toBe('2.4.0')
      expect(state.ui.overlay).toBeUndefined()
      expectCompleteTimeline(state)
    })

    it('asking for help never scores worse than going it alone, and guessing wrong does (#16)', () => {
      const alone = playChapter(config, '09-the-page').state

      // The same path, but before every step the learner shows the hint, asks Kai, and reveals
      // the solution: every kind of help the game offers.
      const started = startChapter(config, blankState(config), '09-the-page')
      let helped = flushEffects(config, started.state, started.effects)
      const question = config.mentorGeneralQuestions?.[0] ?? ''
      for (let guard = 0; helped.story.phase === 'playing' && guard < 100; guard++) {
        const step = currentStep(config, helped)
        if (!step) break
        helped = play(config, helped, [
          { type: 'showHint' },
          { type: 'askMentor', questionId: question },
          { type: 'revealSolution' },
          step.solution ?? { type: 'skipStep' },
        ])
      }
      expect(helped.story.phase).toBe('complete')
      expect(scoreValues(helped.incident.current!)).toEqual(scoreValues(alone.incident.current!))

      const guessed = playChapterRecoverably(config, '09-the-page').state
      const guessedValues = scoreValues(guessed.incident.current!)
      const aloneValues = scoreValues(alone.incident.current!)
      expect(guessedValues.timeToMitigate!).toBeGreaterThan(aloneValues.timeToMitigate!)
      expect(guessedValues.customersAffected!).toBeGreaterThan(aloneValues.customersAffected!)
    })

    it('same actions give the same timeline and scorecard', () => {
      const one = playChapter(config, '09-the-page').state.incident.current!
      const two = playChapter(config, '09-the-page').state.incident.current!
      expect(two.timeline).toEqual(one.timeline)
      expect(scoreValues(two)).toEqual(scoreValues(one))
    })

    it('the timeline reads as plain English for the write-up', () => {
      const { state } = playChapter(config, '09-the-page')
      const text = state.incident.current!.timeline.map((entry) => entry.text)
      expect(text).toContain(
        'Checked hypothesis: A deploy? Confirmed: billing 2.4.0 → 2.4.1 at 14:01, one minute before errors (Argh CD history and the deploy marker).'
      )
      expect(text.some((line) => line.startsWith('Rollback started: reverted'))).toBe(true)
    })

    it('recoverability: every wrong pick explains itself, costs customers, and never dead-ends', () => {
      const golden = playChapter(config, '09-the-page').state
      const { state } = playChapterRecoverably(config, '09-the-page')
      expect(state.story.phase).toBe('complete')
      expectCompleteTimeline(state)
      const golden_customers = golden.incident.current!.impact.customers
      expect(state.incident.current!.impact.customers).toBeGreaterThan(golden_customers + 100)
      const tried = state.incident.current!.timeline.filter((e) => e.kind === 'mitigationChosen')
      expect(tried.length).toBe(5)
    })

    it('a wrong mitigation shows Kai’s explanation inline as well as costing time', () => {
      let state = startAt('stop-bleeding')
      const before = state.clock.now
      state = play(config, state, [
        { type: 'chooseOption', stepId: 'stop-bleeding', optionId: 'scale' },
      ])
      expect(state.story.lastWrongAnswer?.response).toContain('broken copies')
      expect(state.clock.now - before).toBeGreaterThanOrEqual(3 * 60_000)
      expect(currentStep(config, state)?.id).toBe('stop-bleeding')
    })

    /**
     * Plays the golden path's actions until `stepId` is current, so a test can poke at one step.
     */
    function startAt(stepId: string): GameState {
      const started = startChapter(config, blankState(config), '09-the-page')
      let state = flushEffects(config, started.state, started.effects)
      for (let guard = 0; currentStep(config, state)?.id !== stepId; guard++) {
        if (guard > 50) throw new Error(`never reached ${stepId}`)
        state = play(config, state, [currentStep(config, state)!.solution!])
      }
      return state
    }

    it('slowest reasonable path: time passes, every detour is taken, and it still completes', () => {
      const tick = (minutes: number): Action[] =>
        Array.from({ length: minutes * 6 }, () => ({ type: 'tick', deltaMs: 10_000 }))
      const started = startChapter(config, blankState(config), '09-the-page')
      let state = flushEffects(config, started.state, started.effects)
      const step = () => currentStep(config, state)?.id
      const act = (...actions: Action[]) => {
        state = play(config, state, actions)
      }
      const solve = () => act(currentStep(config, state)!.solution!)

      solve() // on-call: the page lands
      act(...tick(4)) // four minutes before acknowledging
      expect(state.incident.current?.impact.customers).toBeGreaterThan(0)
      solve() // ack
      act({ type: 'openTab', tab: 'inkwell' }, ...tick(1))
      solve() // open-dashboard
      for (const optionId of ['blip', 'traffic', 'real']) {
        act({ type: 'chooseOption', stepId: 'is-it-real', optionId })
      }
      act({ type: 'flackReply', messageId: 'kai-nudge-is-it-real', replyId: 'yes' })
      act(...tick(2))
      solve() // slo-burn
      act({ type: 'clickTarget', targetId: 'inkwell-pay-plain' }) // forgot the coupon
      expect(state.flack.messages.at(-1)?.text).toContain('SAVE10')
      act(...tick(2))
      solve() // reproduce
      act(...tick(3))
      solve() // declare
      solve() // take-ops
      for (const id of ['h-traffic', 'h-box', 'h-provider']) {
        act({ type: 'chooseOption', stepId: id, optionId: 'confirmed' }, ...tick(2))
        solve()
      }
      act({ type: 'chooseOption', stepId: 'h-deploy', optionId: 'ruled-out' }, ...tick(3))
      solve()
      expect(step()).toBe('stop-bleeding')
      for (const optionId of ['debug', 'scale', 'wait', 'argh']) {
        act({ type: 'chooseOption', stepId: 'stop-bleeding', optionId })
      }
      // Reaches for Argh CD's own Rollback anyway: it bounces back, and doesn't count as recovered.
      const monday = state.gitops.apps.billing!.history.find((entry) => entry.version === '2.4.0')!
      act({ type: 'rollback', app: 'billing', historyId: monday.id }, ...tick(1))
      expect(state.cluster.wishes.billing?.version).toBe('2.4.1')
      expect(state.incident.current?.marks.mitigated).toBeUndefined()
      expect(
        state.flack.messages.some(
          (m) => m.channel === 'dm-kai' && m.text.includes('GitNub still says')
        )
      ).toBe(true)
      solve() // stop-bleeding: undo the deploy
      act(...tick(2))
      solve() // revert in GitNub
      // Doesn't click Sync: waits for Argh CD's auto-sync instead, and the copies swap.
      act(...tick(1))
      expect(step()).toBe('verify-checkout')
      expect(state.incident.current?.marks.mitigated).toBeDefined()
      const mitigatedCustomers = state.incident.current!.impact.customers
      act(...tick(5))
      solve() // verify-checkout
      for (const optionId of ['running', 'dipped', 'fixed']) {
        act({ type: 'chooseOption', stepId: 'verify-signals', optionId })
      }
      // Posts two weak updates from the composer before the good one.
      act(
        { type: 'clickTarget', targetId: 'status-option:monitoring-early' },
        {
          type: 'incident',
          command: { kind: 'postStatus', stage: 'monitoring', optionId: 'monitoring-early' },
        },
        {
          type: 'incident',
          command: { kind: 'postStatus', stage: 'monitoring', optionId: 'monitoring-clear' },
        }
      )
      expect(step()).toBe('all-clear')
      act(...tick(10))
      act(
        { type: 'clickTarget', targetId: 'status-option:resolved-terse' },
        {
          type: 'incident',
          command: { kind: 'postStatus', stage: 'resolved', optionId: 'resolved-terse' },
        }
      )
      expect(step()).toBe('all-clear')
      solve()
      act(...tick(5))
      solve() // resolve
      expect(state.story.phase).toBe('complete')
      expect(state.incident.current!.impact.customers).toBe(mitigatedCustomers)
      const golden = playChapter(config, '09-the-page').state.incident.current!
      expect(
        state.incident.current!.marks.resolved! - state.incident.current!.startedAt
      ).toBeGreaterThan(golden.marks.resolved! - golden.startedAt)
      const kinds = state.incident.current!.timeline.map((entry) => entry.kind)
      for (const kind of TIMELINE_ORDER) expect(kinds, kind).toContain(kind)
    })

    it('?chapter=09 jumps straight into a Friday with billing 2.4.1 freshly deployed', () => {
      const chapter = config.chapters.find((c) => c.id === '09' || c.id.startsWith('09-'))
      expect(chapter?.id).toBe('09-the-page')
      const started = startChapter(config, blankState(config), '09-the-page')
      const state = started.state
      expect(state.cluster.wishes.billing?.version).toBe('2.4.1')
      expect(state.gitops.deployRepo.wishes.billing?.version).toBe('2.4.1')
      expect(state.gitops.apps.billing?.history.map((entry) => entry.version)).toEqual([
        '2.4.0',
        '2.4.1',
      ])
      const couponDeploy = state.gitops.pullRequests.at(-1)!
      expect(couponDeploy).toMatchObject({ author: 'alex', status: 'merged' })
      expect(
        state.cluster.copies
          .filter((c) => c.app === 'billing' && c.state === 'Running')
          .map((c) => c.version)
      ).toEqual(['2.4.1', '2.4.1'])
      expect(state.ui.unlockedTabs).toContain('pagerdoody')
      expect(state.incident.current).toBeUndefined()
    })
  })
})
