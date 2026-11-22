import { COURSE, findLesson, findTrack, lessonsOf, type TrackId } from '../course'
import { firstIncomplete, type Progress } from '../progress/progress'

/** Hash route for a lesson, carrying the track it was opened from (a lesson can be in both). */
export function lessonHref(lessonId: string, trackId?: TrackId): string {
  return trackId ? `/lesson/${lessonId}?track=${trackId}` : `/lesson/${lessonId}`
}

/**
 * URL of the game page for a lesson. A real page load, not a hash route: the game is its own
 * entry (`play.html`) with its own router and save.
 */
export function playHref(lessonId: string, trackId?: TrackId): string {
  const params = new URLSearchParams({ lesson: lessonId })
  if (trackId) params.set('track', trackId)
  return `${import.meta.env.BASE_URL}play.html?${params}`
}

/** The academy's lesson page, as a full URL, for linking back from the game page. */
export function academyLessonUrl(lessonId: string, trackId?: string | null): string {
  const query = trackId ? `?track=${encodeURIComponent(trackId)}` : ''
  return `${import.meta.env.BASE_URL}#/lesson/${encodeURIComponent(lessonId)}${query}`
}

export const TIER_LABELS = { browser: 'Browser', local: 'Local', cloud: 'Cloud' } as const

/** Where "Continue" goes: the last lesson opened, else the first unfinished one in the last track. */
export function continueHref(progress: Progress): string | undefined {
  const track = findTrack(COURSE, progress.lastTrack ?? 'practitioner')
  if (progress.lastLesson && findLesson(COURSE, progress.lastLesson)) {
    return lessonHref(progress.lastLesson, track?.id)
  }
  if (!track || !progress.lastTrack) return undefined
  const next = firstIncomplete(progress, lessonsOf(track))
  return next ? lessonHref(next.id, track.id) : undefined
}
