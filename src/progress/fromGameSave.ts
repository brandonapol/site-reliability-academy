import type { GameLesson } from '../course'
import type { Progress } from './progress'

/** The part of a feauxbernetes save (`feauxbernetes:v1`) that says how far the learner got. */
export interface GameStoryProgress {
  chapterId: string
  completedChapters: readonly string[]
}

/**
 * Carries a game save into course progress (#15). The game and the academy share an origin, so a
 * learner who played feauxbernetes before the academy existed, or who plays on `play.html` between
 * academy visits, already has a save. Without this, the course map would show every lesson as not
 * started and "Continue" would point at week 1.
 *
 * - A lesson with a completed chapter, or holding the current chapter, is marked started.
 * - If the learner has no "continue" lesson yet, it becomes the lesson holding the current chapter.
 * - Nothing is ever marked complete: that's the learner's call, from the Check list.
 *
 * Idempotent, and it never overwrites what course progress already says, so it runs on every
 * academy load. Returns `progress` itself when nothing changes.
 */
export function progressFromGameSave(
  progress: Progress,
  story: GameStoryProgress,
  lessons: readonly GameLesson[],
  now: Date
): Progress {
  const reached = new Set([...story.completedChapters, story.chapterId])
  let lessonsProgress = progress.lessons
  for (const lesson of lessons) {
    const existing = lessonsProgress[lesson.id]
    if (existing?.startedAt) continue
    if (!lesson.do.chapters.some((chapter) => reached.has(chapter))) continue
    lessonsProgress = {
      ...lessonsProgress,
      [lesson.id]: { ...(existing ?? { checked: [] }), startedAt: now.toISOString() },
    }
  }
  const current = lessons.find((lesson) => lesson.do.chapters.includes(story.chapterId))
  const lastLesson = progress.lastLesson ?? current?.id
  if (lessonsProgress === progress.lessons && lastLesson === progress.lastLesson) return progress
  return {
    ...progress,
    lessons: lessonsProgress,
    ...(lastLesson ? { lastLesson } : {}),
  }
}
