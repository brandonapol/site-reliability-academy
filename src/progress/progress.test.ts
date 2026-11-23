import { describe, expect, it } from 'vitest'

import { PHASE_1_LESSONS } from '../course/lessons/phase1'
import {
  emptyProgress,
  firstIncomplete,
  groupStatus,
  lessonStatus,
  parseProgress,
  PROGRESS_KEY,
  serializeProgress,
  setChecked,
  setKeep,
  setComplete,
  visitLesson,
} from './progress'
import { createProgressStore, type StorageLike } from './store'

const NOW = new Date('2026-11-21T12:00:00Z')

function fakeStorage(
  initial: Record<string, string> = {}
): StorageLike & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value
    },
    removeItem: (key) => {
      delete data[key]
    },
  }
}

describe('progress updates', () => {
  it('moves a lesson from not started, to in progress, to complete', () => {
    let progress = emptyProgress()
    expect(lessonStatus(progress, 'inkwell-boxes')).toBe('not-started')

    progress = visitLesson(progress, 'inkwell-boxes', 'practitioner', NOW)
    expect(lessonStatus(progress, 'inkwell-boxes')).toBe('in-progress')
    expect(progress.lastLesson).toBe('inkwell-boxes')
    expect(progress.lastTrack).toBe('practitioner')

    progress = setChecked(progress, 'inkwell-boxes', 'explain-self-heal', true, NOW)
    expect(progress.lessons['inkwell-boxes'].checked).toEqual(['explain-self-heal'])

    progress = setComplete(progress, 'inkwell-boxes', true, NOW)
    expect(lessonStatus(progress, 'inkwell-boxes')).toBe('complete')

    progress = setComplete(progress, 'inkwell-boxes', false, NOW)
    expect(lessonStatus(progress, 'inkwell-boxes')).toBe('in-progress')
  })

  it('returns the same object when nothing changes', () => {
    const progress = setChecked(emptyProgress(), 'a', 'x', true, NOW)
    expect(setChecked(progress, 'a', 'x', true, NOW)).toBe(progress)
    expect(setComplete(progress, 'a', false, NOW)).toBe(progress)
  })

  it('summarizes a group and finds the first incomplete lesson', () => {
    let progress = emptyProgress()
    expect(groupStatus(progress, PHASE_1_LESSONS)).toBe('not-started')
    progress = setComplete(progress, 'inkwell-boxes', true, NOW)
    expect(groupStatus(progress, PHASE_1_LESSONS)).toBe('in-progress')
    expect(firstIncomplete(progress, PHASE_1_LESSONS)?.id).toBe('inkwell-change')
    for (const lesson of PHASE_1_LESSONS) progress = setComplete(progress, lesson.id, true, NOW)
    expect(groupStatus(progress, PHASE_1_LESSONS)).toBe('complete')
    expect(firstIncomplete(progress, PHASE_1_LESSONS)).toBeUndefined()
  })
})

describe('parseProgress', () => {
  it('round-trips through export and import, keeping lessons the course no longer has', () => {
    let progress = setComplete(emptyProgress(), 'a-lesson-that-was-removed', true, NOW)
    progress = visitLesson(progress, 'inkwell-boxes', 'everyone', NOW)
    expect(parseProgress(serializeProgress(progress))).toEqual(progress)
  })

  it.each([
    ['not JSON', '{nope'],
    ['the wrong version', JSON.stringify({ version: 2, lessons: {} })],
    ['missing lessons', JSON.stringify({ version: 1 })],
    ['a malformed lesson', JSON.stringify({ version: 1, lessons: { a: { checked: 'x' } } })],
    ['null', 'null'],
  ])('rejects %s', (_, raw) => {
    expect(parseProgress(raw)).toBeUndefined()
  })
})

describe('a Keep in progress (#18)', () => {
  const SLO = {
    kind: 'slo',
    sli: 'Checkouts that succeed within 2 seconds',
    target: 0.999,
    windowDays: 30,
    chosenAt: NOW.toISOString(),
  } as const

  it('is recorded, starts the lesson, and round-trips', () => {
    const progress = setKeep(emptyProgress(), 'inkwell-nines', SLO, NOW)
    expect(progress.lessons['inkwell-nines']).toEqual({
      checked: [],
      startedAt: NOW.toISOString(),
      keep: SLO,
    })
    expect(parseProgress(serializeProgress(progress))).toEqual(progress)
  })

  it('leaves a save from before Keeps existing exactly as it was', () => {
    const before = JSON.stringify({
      version: 1,
      lessons: { 'inkwell-measure': { checked: ['slo-parts'], startedAt: NOW.toISOString() } },
      lastLesson: 'inkwell-measure',
    })
    expect(parseProgress(before)).toEqual(JSON.parse(before))
  })

  it.each([
    ['an unknown kind', { ...SLO, kind: 'scorecard' }],
    ['a 100% target', { ...SLO, target: 1 }],
    ['a missing SLI', { ...SLO, sli: undefined }],
    ['another window', { ...SLO, windowDays: 7 }],
  ])('drops a Keep with %s and keeps the rest of the lesson', (_, keep) => {
    const raw = JSON.stringify({
      version: 1,
      lessons: { 'inkwell-nines': { checked: ['tenfold'], keep } },
    })
    expect(parseProgress(raw)?.lessons['inkwell-nines']).toEqual({ checked: ['tenfold'] })
  })
})

describe('the progress store', () => {
  it('survives a reload', () => {
    const storage = fakeStorage()
    createProgressStore(storage).update((p) => setComplete(p, 'inkwell-boxes', true, NOW))
    const reloaded = createProgressStore(storage)
    expect(lessonStatus(reloaded.get(), 'inkwell-boxes')).toBe('complete')
  })

  it('sets a corrupt save aside instead of throwing', () => {
    const storage = fakeStorage({ [PROGRESS_KEY]: '{corrupt' })
    const store = createProgressStore(storage)
    expect(store.discardedOnLoad).toBe(true)
    expect(store.get()).toEqual(emptyProgress())
    expect(storage.data[`${PROGRESS_KEY}:discarded`]).toBe('{corrupt')
  })

  it('keeps working in memory when storage throws', () => {
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('quota')
      },
      removeItem: () => {},
    }
    const store = createProgressStore(throwing)
    store.update((p) => setComplete(p, 'inkwell-boxes', true, NOW))
    expect(lessonStatus(store.get(), 'inkwell-boxes')).toBe('complete')
    expect(store.saveFailed).toBe(true)
  })

  it('notifies subscribers, and clears', () => {
    const store = createProgressStore(fakeStorage())
    let calls = 0
    const unsubscribe = store.subscribe(() => calls++)
    store.update((p) => visitLesson(p, 'inkwell-boxes', 'practitioner', NOW))
    store.clear()
    unsubscribe()
    store.update((p) => visitLesson(p, 'inkwell-boxes', 'practitioner', NOW))
    expect(calls).toBe(2)
  })
})
