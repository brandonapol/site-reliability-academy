import type { Course, Lesson } from './types'

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/

/**
 * Checks the course data for mistakes that would break navigation or progress. Returns a list of
 * problems; empty means valid. Run as a test (`course.test.ts`), so a bad edit fails CI.
 *
 * `chapterIds` are the game's chapter IDs (`src/content/chapters`) and `scenarioIds` the decision
 * simulations' (`@sra/engine/decision/scenarios`), passed in so this stays a pure function of its
 * inputs.
 */
export function validateCourse(
  course: Course,
  chapterIds: readonly string[],
  scenarioIds: readonly string[]
): string[] {
  const problems: string[] = []
  const lessonsById = new Map<string, Lesson>()
  const otherIds = new Map<string, string>()
  const knownChapters = new Set(chapterIds)
  const knownScenarios = new Set(scenarioIds)

  const claim = (id: string, what: string) => {
    if (!KEBAB.test(id)) problems.push(`${what} id "${id}" is not kebab-case`)
    const previous = otherIds.get(id)
    if (previous) problems.push(`${what} id "${id}" is already used by a ${previous}`)
    else otherIds.set(id, what)
  }

  for (const track of course.tracks) {
    claim(track.id, 'track')
    for (const phase of track.phases) {
      claim(phase.id, 'phase')
      for (const unit of phase.units) {
        claim(unit.id, 'unit')
        for (const lesson of unit.lessons) {
          const seen = lessonsById.get(lesson.id)
          if (seen) {
            // Sharing a lesson between tracks is fine, but only the same lesson, by reference.
            if (seen !== lesson) problems.push(`lesson id "${lesson.id}" is used by two lessons`)
            continue
          }
          lessonsById.set(lesson.id, lesson)
          claim(lesson.id, 'lesson')

          const checkIds = new Set<string>()
          for (const item of lesson.check) {
            if (!KEBAB.test(item.id)) {
              problems.push(`check item "${item.id}" in "${lesson.id}" is not kebab-case`)
            }
            if (checkIds.has(item.id)) {
              problems.push(`check item "${item.id}" appears twice in "${lesson.id}"`)
            }
            checkIds.add(item.id)
          }

          if (lesson.do.kind === 'game') {
            if (lesson.do.chapters.length === 0) {
              problems.push(`lesson "${lesson.id}" plays the game but lists no chapters`)
            }
            for (const chapter of lesson.do.chapters) {
              if (!knownChapters.has(chapter)) {
                problems.push(`lesson "${lesson.id}" refers to unknown chapter "${chapter}"`)
              }
            }
          }
          if (lesson.do.kind === 'simulation' && !knownScenarios.has(lesson.do.scenario)) {
            problems.push(
              `lesson "${lesson.id}" refers to unknown scenario "${lesson.do.scenario}"`
            )
          }
        }
      }
    }
  }

  return problems
}
