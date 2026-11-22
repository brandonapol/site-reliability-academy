import type { Lesson, TrackId } from '../course'

/**
 * Course progress (#40): what a learner has ticked and finished, keyed by lesson ID, stored in this
 * browser only (no sign-in in the first release). Separate from the game's own save
 * (`feauxbernetes:v1`), which records where they are inside the game.
 *
 * Everything here is a pure function of its inputs; `store.ts` adds storage and subscriptions.
 */

export const PROGRESS_KEY = 'sra:progress:v1'
export const PROGRESS_VERSION = 1

export interface LessonProgress {
  /** Ticked "know before moving on" items, by check item id. */
  checked: string[]
  /** ISO timestamps. */
  startedAt?: string
  completedAt?: string
}

export interface Progress {
  version: typeof PROGRESS_VERSION
  /**
   * By lesson id. Entries for lessons that no longer exist are kept, not pruned: an id might come
   * back, and the learner's record shouldn't depend on today's course data.
   */
  lessons: Record<string, LessonProgress>
  /** For "continue where you left off". */
  lastTrack?: TrackId
  lastLesson?: string
}

export type LessonStatus = 'not-started' | 'in-progress' | 'complete'

export function emptyProgress(): Progress {
  return { version: PROGRESS_VERSION, lessons: {} }
}

function entry(progress: Progress, lessonId: string): LessonProgress {
  return progress.lessons[lessonId] ?? { checked: [] }
}

function withEntry(progress: Progress, lessonId: string, next: LessonProgress): Progress {
  return { ...progress, lessons: { ...progress.lessons, [lessonId]: next } }
}

/** Opening a lesson: marks it started and remembers it (and its track) for "continue". */
export function visitLesson(
  progress: Progress,
  lessonId: string,
  trackId: TrackId | undefined,
  now: Date
): Progress {
  const current = entry(progress, lessonId)
  const next = current.startedAt
    ? progress
    : withEntry(progress, lessonId, { ...current, startedAt: now.toISOString() })
  return { ...next, lastLesson: lessonId, lastTrack: trackId ?? progress.lastTrack }
}

export function setChecked(
  progress: Progress,
  lessonId: string,
  itemId: string,
  checked: boolean,
  now: Date
): Progress {
  const current = entry(progress, lessonId)
  const has = current.checked.includes(itemId)
  if (has === checked) return progress
  return withEntry(progress, lessonId, {
    ...current,
    startedAt: current.startedAt ?? now.toISOString(),
    checked: checked ? [...current.checked, itemId] : current.checked.filter((id) => id !== itemId),
  })
}

export function setComplete(
  progress: Progress,
  lessonId: string,
  complete: boolean,
  now: Date
): Progress {
  const current = entry(progress, lessonId)
  if (Boolean(current.completedAt) === complete) return progress
  const next: LessonProgress = { ...current }
  if (complete) {
    next.startedAt ??= now.toISOString()
    next.completedAt = now.toISOString()
  } else {
    delete next.completedAt
  }
  return withEntry(progress, lessonId, next)
}

export function lessonStatus(progress: Progress, lessonId: string): LessonStatus {
  const current = progress.lessons[lessonId]
  if (!current) return 'not-started'
  if (current.completedAt) return 'complete'
  return current.startedAt || current.checked.length ? 'in-progress' : 'not-started'
}

/** The status of a group of lessons (a unit, a phase): complete only when all of them are. */
export function groupStatus(progress: Progress, lessons: readonly Lesson[]): LessonStatus {
  if (lessons.length === 0) return 'not-started'
  const statuses = lessons.map((lesson) => lessonStatus(progress, lesson.id))
  if (statuses.every((status) => status === 'complete')) return 'complete'
  return statuses.every((status) => status === 'not-started') ? 'not-started' : 'in-progress'
}

/** The first lesson in `lessons` that isn't complete, or undefined when all are. */
export function firstIncomplete(
  progress: Progress,
  lessons: readonly Lesson[]
): Lesson | undefined {
  return lessons.find((lesson) => lessonStatus(progress, lesson.id) !== 'complete')
}

/**
 * Parses saved or imported progress. Returns undefined for anything that isn't a progress file
 * this version understands, so callers can discard it rather than crash.
 */
export function parseProgress(raw: string): Progress | undefined {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return undefined
  }
  if (!parsed || typeof parsed !== 'object') return undefined
  const candidate = parsed as Partial<Progress>
  if (candidate.version !== PROGRESS_VERSION) return undefined
  if (!candidate.lessons || typeof candidate.lessons !== 'object') return undefined
  const lessons: Record<string, LessonProgress> = {}
  for (const [id, value] of Object.entries(candidate.lessons)) {
    if (!value || typeof value !== 'object' || !Array.isArray(value.checked)) return undefined
    lessons[id] = {
      checked: value.checked.filter((item): item is string => typeof item === 'string'),
      ...(typeof value.startedAt === 'string' ? { startedAt: value.startedAt } : {}),
      ...(typeof value.completedAt === 'string' ? { completedAt: value.completedAt } : {}),
    }
  }
  return {
    version: PROGRESS_VERSION,
    lessons,
    ...(candidate.lastTrack === 'practitioner' || candidate.lastTrack === 'everyone'
      ? { lastTrack: candidate.lastTrack }
      : {}),
    ...(typeof candidate.lastLesson === 'string' ? { lastLesson: candidate.lastLesson } : {}),
  }
}

export function serializeProgress(progress: Progress): string {
  return JSON.stringify(progress, null, 2)
}
