import { describe, expect, it } from 'vitest'

import { blankState, startChapter } from '@sra/engine/game'
import { createGameConfig } from '../content/config'
import { COURSE, gameLessonsOf } from '../course'
import { continueHref } from '../academy/links'
import { progressFromGameSave } from '../progress/fromGameSave'
import { emptyProgress } from '../progress/progress'
import { createGameStore, type Timers } from '../store/gameStore'
import { loadSave, writeSave, type StorageLike } from '../store/persistence'
import { lessonStart } from './lessonStart'

function memoryStorage(): StorageLike {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  }
}

const idleTimers: Timers = {
  setTimeout: () => 0,
  clearTimeout: () => undefined,
  setInterval: () => 0,
  clearInterval: () => undefined,
}

/** A feauxbernetes save from partway through week 2: weeks 1 and GitOps done, a step into CI. */
function midWeek2Save(storage: StorageLike) {
  const config = createGameConfig()
  const { state } = startChapter(config, blankState(config), '05-ci')
  const game = {
    ...state,
    story: {
      ...state.story,
      stepIndex: 1,
      completedChapters: ['00-welcome', '01-boxes', '02-order-form', '03-self-heal', '04-gitops'],
    },
  }
  writeSave(storage, game, [])
  return game
}

describe('a feauxbernetes save from mid-week 2 (#15)', () => {
  it('opens the academy at the same lesson, and the game at the same step', () => {
    const storage = memoryStorage()
    const saved = midWeek2Save(storage)

    const loaded = loadSave(storage)
    if (loaded.kind !== 'loaded') throw new Error(`save did not load: ${loaded.kind}`)
    const progress = progressFromGameSave(
      emptyProgress(),
      loaded.save.game.story,
      gameLessonsOf(COURSE),
      new Date('2026-11-23T10:00:00Z')
    )
    expect(continueHref(progress)).toBe('/lesson/inkwell-change?track=practitioner')

    const start = lessonStart('?lesson=inkwell-change', loaded.save.game.story.chapterId)
    expect(new URLSearchParams(start.search).has('chapter')).toBe(false)

    const store = createGameStore({
      config: createGameConfig(),
      storage,
      timers: idleTimers,
      search: start.search,
    })
    expect(store.getState().game.story.chapterId).toBe('05-ci')
    expect(store.getState().game.story.stepIndex).toBe(saved.story.stepIndex)
  })
})
