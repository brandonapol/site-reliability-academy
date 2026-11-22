import { describe, expect, it } from 'vitest'

import { INKWELL_CHANGE } from '../course/lessons/phase1'
import { lessonFinished, lessonStart } from './lessonStart'

describe('lessonStart', () => {
  it('leaves the game alone when no lesson is named', () => {
    expect(lessonStart('?fast=1', '01-boxes')).toEqual({ search: '?fast=1' })
  })

  it('ignores an unknown lesson', () => {
    expect(lessonStart('?lesson=nope', undefined)).toEqual({ search: '?lesson=nope' })
  })

  it("jumps to the lesson's first chapter when the save is elsewhere", () => {
    const start = lessonStart('?lesson=inkwell-change&fast=1', '01-boxes')
    expect(start.lesson?.id).toBe('inkwell-change')
    expect(new URLSearchParams(start.search).get('chapter')).toBe('04-gitops')
    expect(new URLSearchParams(start.search).get('fast')).toBe('1')
  })

  it('resumes when the save is already inside the lesson', () => {
    const start = lessonStart('?lesson=inkwell-change', '05-ci')
    expect(start.search).toBe('?lesson=inkwell-change')
  })

  it('lets an explicit chapter win', () => {
    const start = lessonStart('?lesson=inkwell-change&chapter=06-wrap', undefined)
    expect(new URLSearchParams(start.search).get('chapter')).toBe('06-wrap')
  })
})

describe('lessonFinished', () => {
  const story = (chapterId: string, phase: string, completedChapters: string[] = []) => ({
    chapterId,
    phase,
    completedChapters,
  })

  it('is false while the lesson is being played', () => {
    expect(lessonFinished(INKWELL_CHANGE, story('04-gitops', 'playing'))).toBe(false)
    expect(lessonFinished(INKWELL_CHANGE, story('05-ci', 'complete', ['04-gitops']))).toBe(false)
  })

  it('is true once the last chapter is complete, or the game has moved past it', () => {
    expect(lessonFinished(INKWELL_CHANGE, story('06-wrap', 'complete'))).toBe(true)
    expect(
      lessonFinished(INKWELL_CHANGE, story('ch6-seeing-inside', 'playing', ['04-gitops', '05-ci']))
    ).toBe(true)
  })

  it('is false in an unrelated chapter the lesson never touched', () => {
    expect(lessonFinished(INKWELL_CHANGE, story('01-boxes', 'playing', ['00-welcome']))).toBe(false)
  })
})
