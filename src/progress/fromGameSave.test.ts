import { describe, expect, it } from 'vitest'

import { COURSE, gameLessonsOf } from '../course'
import { progressFromGameSave } from './fromGameSave'
import { emptyProgress, setChecked, visitLesson } from './progress'

const LESSONS = gameLessonsOf(COURSE)
const NOW = new Date('2026-11-23T10:00:00Z')
const EARLIER = new Date('2026-11-01T10:00:00Z')

const midWeek2 = {
  chapterId: '05-ci',
  completedChapters: ['00-welcome', '01-boxes', '02-order-form', '03-self-heal', '04-gitops'],
}

describe('progressFromGameSave', () => {
  it('lists each Phase 1 lesson once, though both tracks share them', () => {
    expect(LESSONS.map((lesson) => lesson.id)).toEqual([
      'inkwell-boxes',
      'inkwell-change',
      'inkwell-measure',
      'inkwell-first-page',
    ])
  })

  it('starts every lesson the save reached and continues at the current chapter', () => {
    const progress = progressFromGameSave(emptyProgress(), midWeek2, LESSONS, NOW)
    expect(Object.keys(progress.lessons)).toEqual(['inkwell-boxes', 'inkwell-change'])
    expect(progress.lessons['inkwell-change']).toEqual({
      checked: [],
      startedAt: NOW.toISOString(),
    })
    expect(progress.lastLesson).toBe('inkwell-change')
  })

  it('never marks a lesson complete', () => {
    const progress = progressFromGameSave(emptyProgress(), midWeek2, LESSONS, NOW)
    expect(Object.values(progress.lessons).some((lesson) => lesson.completedAt)).toBe(false)
  })

  it('keeps what course progress already says', () => {
    let before = visitLesson(emptyProgress(), 'inkwell-boxes', 'everyone', EARLIER)
    before = setChecked(before, 'inkwell-boxes', 'some-item', true, EARLIER)
    const after = progressFromGameSave(before, midWeek2, LESSONS, NOW)
    expect(after.lessons['inkwell-boxes']).toEqual(before.lessons['inkwell-boxes'])
    expect(after.lastLesson).toBe('inkwell-boxes')
    expect(after.lastTrack).toBe('everyone')
    expect(after.lessons['inkwell-change'].startedAt).toBe(NOW.toISOString())
  })

  it('returns the same object when there is nothing new, so it can run on every load', () => {
    const once = progressFromGameSave(emptyProgress(), midWeek2, LESSONS, NOW)
    expect(progressFromGameSave(once, midWeek2, LESSONS, NOW)).toBe(once)
  })

  it('ignores chapters no lesson plays', () => {
    const story = { chapterId: 'no-such-chapter', completedChapters: [] }
    const progress = emptyProgress()
    expect(progressFromGameSave(progress, story, LESSONS, NOW)).toBe(progress)
  })
})
