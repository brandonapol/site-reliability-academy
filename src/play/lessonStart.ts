import { COURSE, findLesson, type GameLesson, type Lesson } from '../course'

export type { GameLesson }

function isGameLesson(lesson: Lesson | undefined): lesson is GameLesson {
  return lesson?.do.kind === 'game'
}

export interface LessonStart {
  /** The lesson the game was opened for, if `?lesson=` named a game lesson. */
  lesson?: GameLesson
  /** The `search` string to hand the game store: may add `chapter=` to start the lesson. */
  search: string
}

/**
 * Decides where the game starts when the academy opens it for a lesson (#43):
 *
 * - The saved game is already inside this lesson's chapters → resume it (no `chapter=` jump).
 * - Otherwise → jump to the lesson's first chapter. As with any `?chapter=` jump, this replaces
 *   the saved game, whose only job is to remember the current chapter; course progress is kept
 *   separately and isn't touched.
 *
 * An explicit `?chapter=` in the URL (used by tests and debugging) always wins.
 */
export function lessonStart(search: string, savedChapterId: string | undefined): LessonStart {
  const params = new URLSearchParams(search)
  const lesson = findLesson(COURSE, params.get('lesson') ?? '')
  if (!isGameLesson(lesson)) return { search }
  if (params.has('chapter')) return { lesson, search }
  if (savedChapterId && lesson.do.chapters.includes(savedChapterId)) return { lesson, search }
  params.set('chapter', lesson.do.chapters[0])
  return { lesson, search: `?${params}` }
}

/** True once the learner has finished (or moved past) the lesson's last chapter. */
export function lessonFinished(
  lesson: GameLesson,
  story: { chapterId: string; phase: string; completedChapters: readonly string[] }
): boolean {
  const chapters = lesson.do.chapters
  const last = chapters[chapters.length - 1]
  if (story.completedChapters.includes(last)) return true
  if (story.chapterId === last) return story.phase !== 'playing'
  return (
    !chapters.includes(story.chapterId) && story.completedChapters.some((c) => chapters.includes(c))
  )
}
