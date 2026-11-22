import { describe, expect, it } from 'vitest'

import { CHAPTERS } from '../content/chapters'
import {
  COURSE,
  findLesson,
  findTrack,
  lessonsOf,
  neighbours,
  placementFor,
  placementsOf,
  validateCourse,
  type Course,
  type Lesson,
} from '.'

const CHAPTER_IDS = CHAPTERS.map((chapter) => chapter.id)

function lesson(id: string, extra: Partial<Lesson> = {}): Lesson {
  return { id, title: id, summary: '', do: { kind: 'text', summary: '' }, check: [], ...extra }
}

/** A copy of the course with `extra` appended to the first Practitioner unit with no lessons. */
function withLesson(extra: Lesson): { course: Course; unitId: string; previousId?: string } {
  const course: Course = structuredClone(COURSE)
  const units = course.tracks[0].phases.flatMap((phase) => phase.units)
  const index = units.findIndex((u) => !u.lessons.length)
  const previousId = units
    .slice(0, index)
    .flatMap((u) => u.lessons)
    .at(-1)?.id
  units[index].lessons.push(extra)
  return { course, unitId: units[index].id, previousId }
}

describe('the course data', () => {
  it('is valid', () => {
    expect(validateCourse(COURSE, CHAPTER_IDS)).toEqual([])
  })

  it('has both tracks with every phase, week and module from the spec', () => {
    const practitioner = findTrack(COURSE, 'practitioner')!
    expect(practitioner.phases).toHaveLength(6)
    const weeks = practitioner.phases.flatMap((phase) => phase.units).map((unit) => unit.number)
    expect(weeks).toEqual(Array.from({ length: 28 }, (_, i) => i + 1))

    const everyone = findTrack(COURSE, 'everyone')!
    const modules = everyone.phases.flatMap((phase) => phase.units)
    expect(modules.filter((unit) => unit.kind === 'module').map((unit) => unit.number)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ])
    expect(modules.some((unit) => unit.kind === 'capstone')).toBe(true)
  })

  it('shares Phase 1 with module 1 by reference, not by copy', () => {
    const [practitioner, everyone] = COURSE.tracks
    const phase1 = practitioner.phases[0].units.flatMap((unit) => unit.lessons)
    const module1 = everyone.phases[0].units[0].lessons
    expect(module1).toEqual(phase1)
    expect(module1[0]).toBe(phase1[0])
    expect(placementsOf(COURSE, 'inkwell-boxes').map((p) => p.track.id)).toEqual([
      'practitioner',
      'everyone',
    ])
  })

  it('plays every game chapter exactly once across Phase 1', () => {
    const chapters = lessonsOf(COURSE.tracks[0]).flatMap((l) =>
      l.do.kind === 'game' ? l.do.chapters : []
    )
    expect([...chapters].sort()).toEqual([...CHAPTER_IDS].sort())
  })
})

describe('adding a lesson', () => {
  it('needs only data: the new lesson is found, placed and given neighbours', () => {
    const { course, unitId, previousId } = withLesson(lesson('a-brand-new-lesson'))
    expect(validateCourse(course, CHAPTER_IDS)).toEqual([])
    expect(findLesson(course, 'a-brand-new-lesson')?.title).toBe('a-brand-new-lesson')
    const placement = placementFor(course, 'a-brand-new-lesson')!
    expect(placement.unit.id).toBe(unitId)
    expect(neighbours(placement.track, 'a-brand-new-lesson').previous?.id).toBe(previousId)
  })
})

describe('validateCourse', () => {
  it('rejects a duplicate lesson id', () => {
    const { course } = withLesson(lesson('inkwell-boxes'))
    expect(validateCourse(course, CHAPTER_IDS)).toContain(
      'lesson id "inkwell-boxes" is used by two lessons'
    )
  })

  it('rejects a lesson id that collides with a unit id', () => {
    expect(validateCourse(withLesson(lesson('week-01')).course, CHAPTER_IDS)).toContain(
      'lesson id "week-01" is already used by a unit'
    )
  })

  it('rejects a dangling chapter reference', () => {
    const { course } = withLesson(
      lesson('missing-chapter', { do: { kind: 'game', chapters: ['99-nope'], summary: '' } })
    )
    expect(validateCourse(course, CHAPTER_IDS)).toContain(
      'lesson "missing-chapter" refers to unknown chapter "99-nope"'
    )
  })

  it('rejects ids that are not kebab-case, and repeated check items', () => {
    const { course } = withLesson(
      lesson('Bad_Id', {
        check: [
          { id: 'one', text: 'One' },
          { id: 'one', text: 'Again' },
        ],
      })
    )
    const problems = validateCourse(course, CHAPTER_IDS)
    expect(problems).toContain('lesson id "Bad_Id" is not kebab-case')
    expect(problems).toContain('check item "one" appears twice in "Bad_Id"')
  })
})
