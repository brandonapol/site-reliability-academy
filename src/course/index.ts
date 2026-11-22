import { EVERYONE } from './everyone'
import { PRACTITIONER } from './practitioner'
import type { Course, Lesson, Phase, Track, TrackId, Unit } from './types'

export type * from './types'
export { validateCourse } from './validate'

export const COURSE: Course = { tracks: [PRACTITIONER, EVERYONE] }

/** Where a lesson sits. A shared lesson (Phase 1 / module 1) has one placement per track. */
export interface Placement {
  track: Track
  phase: Phase
  unit: Unit
}

export function findTrack(course: Course, id: string): Track | undefined {
  return course.tracks.find((track) => track.id === id)
}

export function placementsOf(course: Course, lessonId: string): Placement[] {
  const found: Placement[] = []
  for (const track of course.tracks) {
    for (const phase of track.phases) {
      for (const unit of phase.units) {
        if (unit.lessons.some((lesson) => lesson.id === lessonId))
          found.push({ track, phase, unit })
      }
    }
  }
  return found
}

export function findLesson(course: Course, lessonId: string): Lesson | undefined {
  for (const track of course.tracks) {
    for (const lesson of lessonsOf(track)) if (lesson.id === lessonId) return lesson
  }
  return undefined
}

/** Every lesson in a track, in course order. */
export function lessonsOf(track: Track): Lesson[] {
  return track.phases.flatMap((phase) => phase.units.flatMap((unit) => unit.lessons))
}

export function lessonsOfUnit(unit: Unit): Lesson[] {
  return unit.lessons
}

/** The lessons either side of `lessonId` within one track. */
export function neighbours(track: Track, lessonId: string): { previous?: Lesson; next?: Lesson } {
  const lessons = lessonsOf(track)
  const index = lessons.findIndex((lesson) => lesson.id === lessonId)
  if (index < 0) return {}
  return { previous: lessons[index - 1], next: lessons[index + 1] }
}

/** The placement to show a lesson in: the preferred track if the lesson is in it, else the first. */
export function placementFor(
  course: Course,
  lessonId: string,
  preferredTrack?: TrackId
): Placement | undefined {
  const placements = placementsOf(course, lessonId)
  return placements.find((placement) => placement.track.id === preferredTrack) ?? placements[0]
}
