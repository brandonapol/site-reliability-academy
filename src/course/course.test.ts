import { describe, expect, it } from 'vitest'

import { DECISION_TYPES } from '@sra/engine/decision'
import { findScenario, SCENARIOS } from '@sra/engine/decision/scenarios'
import { CHAPTERS } from '../content/chapters'
import { PHASE_1_LESSONS } from './lessons/phase1'
import {
  COURSE,
  findLesson,
  findTrack,
  lessonsOf,
  neighbors,
  placementFor,
  placementsOf,
  validateCourse,
  type Course,
  type Lesson,
} from '.'

const CHAPTER_IDS = CHAPTERS.map((chapter) => chapter.id)
const SCENARIO_IDS = SCENARIOS.map((scenario) => scenario.id)

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
    expect(validateCourse(COURSE, CHAPTER_IDS, SCENARIO_IDS)).toEqual([])
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
  it('needs only data: the new lesson is found, placed and given neighbors', () => {
    const { course, unitId, previousId } = withLesson(lesson('a-brand-new-lesson'))
    expect(validateCourse(course, CHAPTER_IDS, SCENARIO_IDS)).toEqual([])
    expect(findLesson(course, 'a-brand-new-lesson')?.title).toBe('a-brand-new-lesson')
    const placement = placementFor(course, 'a-brand-new-lesson')!
    expect(placement.unit.id).toBe(unitId)
    expect(neighbors(placement.track, 'a-brand-new-lesson').previous?.id).toBe(previousId)
  })
})

describe('validateCourse', () => {
  it('rejects a duplicate lesson id', () => {
    const { course } = withLesson(lesson('inkwell-boxes'))
    expect(validateCourse(course, CHAPTER_IDS, SCENARIO_IDS)).toContain(
      'lesson id "inkwell-boxes" is used by two lessons'
    )
  })

  it('rejects a lesson id that collides with a unit id', () => {
    expect(
      validateCourse(withLesson(lesson('week-01')).course, CHAPTER_IDS, SCENARIO_IDS)
    ).toContain('lesson id "week-01" is already used by a unit')
  })

  it('rejects a dangling chapter reference', () => {
    const { course } = withLesson(
      lesson('missing-chapter', { do: { kind: 'game', chapters: ['99-nope'], summary: '' } })
    )
    expect(validateCourse(course, CHAPTER_IDS, SCENARIO_IDS)).toContain(
      'lesson "missing-chapter" refers to unknown chapter "99-nope"'
    )
  })

  it('rejects a dangling scenario reference', () => {
    const { course } = withLesson(
      lesson('missing-scenario', { do: { kind: 'simulation', scenario: 'nope', summary: '' } })
    )
    expect(validateCourse(course, CHAPTER_IDS, SCENARIO_IDS)).toContain(
      'lesson "missing-scenario" refers to unknown scenario "nope"'
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
    const problems = validateCourse(course, CHAPTER_IDS, SCENARIO_IDS)
    expect(problems).toContain('lesson id "Bad_Id" is not kebab-case')
    expect(problems).toContain('check item "one" appears twice in "Bad_Id"')
  })
})

describe('Phase 1 reading (#21)', () => {
  const linksOn = (id: string) => findLesson(COURSE, id)?.reading?.map((item) => item.href) ?? []

  it('assigns SRE book chapter 1 in week 1 and chapter 3 in week 3', () => {
    expect(linksOn('inkwell-boxes')).toEqual(['https://sre.google/sre-book/introduction/'])
    expect(linksOn('inkwell-measure')).toEqual(['https://sre.google/sre-book/embracing-risk/'])
  })

  it('says why to read each one now', () => {
    for (const id of ['inkwell-boxes', 'inkwell-measure']) {
      expect(findLesson(COURSE, id)?.reading?.every((item) => item.note)).toBe(true)
    }
  })
})

describe('Phase 1 checklists (#19)', () => {
  const steps = new Set(
    CHAPTERS.flatMap((chapter) => chapter.steps.map((step) => `${chapter.id}/${step.id}`))
  )

  /** What a lesson's `from` may name: a step of a chapter it plays, or a card or the Keep of the
   * scenario it runs. */
  function sources(lesson: Lesson): Set<string> {
    if (lesson.do.kind === 'game') {
      const chapters = lesson.do.chapters
      return new Set([...steps].filter((step) => chapters.includes(step.split('/')[0])))
    }
    if (lesson.do.kind === 'simulation') {
      const scenario = findScenario(lesson.do.scenario)!
      const moments = [...DECISION_TYPES, ...(scenario.keep ? ['keep'] : [])]
      return new Set(moments.map((moment) => `${scenario.id}/${moment}`))
    }
    return new Set()
  }

  for (const lesson of PHASE_1_LESSONS) {
    it(`${lesson.id} has four to six items, each traced to something it plays`, () => {
      expect(lesson.check.length).toBeGreaterThanOrEqual(4)
      expect(lesson.check.length).toBeLessThanOrEqual(6)
      const known = sources(lesson)
      for (const item of lesson.check) {
        expect(item.from, item.id).toBeDefined()
        expect(known.has(item.from ?? ''), `${item.id} → ${item.from}`).toBe(true)
      }
    })
  }

  it('asks why at least once a week, and never "Understand X"', () => {
    for (const lesson of PHASE_1_LESSONS) {
      expect(
        lesson.check.some((item) => /\bwhy\b/i.test(item.text)),
        lesson.id
      ).toBe(true)
      expect(lesson.check.every((item) => !/^understand\b/i.test(item.text))).toBe(true)
    }
  })

  it('carries the culture thread in week 3: 100% is the wrong target', () => {
    for (const id of ['inkwell-measure', 'inkwell-nines']) {
      const lesson = PHASE_1_LESSONS.find((l) => l.id === id)
      expect(
        lesson?.check.some((item) => /\bwhy\b/i.test(item.text) && item.text.includes('100%')),
        id
      ).toBe(true)
    }
  })
})

describe('the nines game in week 3 (#18)', () => {
  it('follows the SLO chapter in both tracks and takes over the week 3 Keep', () => {
    for (const track of COURSE.tracks) {
      const ids = lessonsOf(track).map((l) => l.id)
      expect(ids.indexOf('inkwell-nines'), track.id).toBe(ids.indexOf('inkwell-measure') + 1)
    }
    expect(findLesson(COURSE, 'inkwell-measure')?.keep).toBeUndefined()
    expect(findLesson(COURSE, 'inkwell-nines')?.keep?.title).toBe('Your first SLO')
  })

  it('runs a scenario with an SLO choice, and plays no game chapters', () => {
    const lesson = findLesson(COURSE, 'inkwell-nines')!
    expect(lesson.do.kind).toBe('simulation')
    if (lesson.do.kind !== 'simulation') return
    expect(findScenario(lesson.do.scenario)?.keep).toBeDefined()
  })
})
