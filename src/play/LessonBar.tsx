import { useLayoutEffect, useRef } from 'react'

import { academyLessonUrl } from '../academy/links'
import { useGame } from '../store'
import { lessonFinished, type GameLesson } from './lessonStart'
import styles from './LessonBar.module.css'

/**
 * The slim bar above the game when it was opened from a lesson (#43): which lesson this is, a way
 * back, and a nudge to go and do the lesson's Check once its chapters are done.
 */
export function LessonBar({ lesson, trackId }: { lesson: GameLesson; trackId: string | null }) {
  const ref = useRef<HTMLElement>(null)
  const finished = useGame((state) => lessonFinished(lesson, state.game.story))
  const back = academyLessonUrl(lesson.id, trackId)

  // Tell the game's layout how much height the bar takes (see Layout.module.css).
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const root = document.documentElement
    const update = () => root.style.setProperty('--lesson-bar-height', `${element.offsetHeight}px`)
    update()
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update)
    observer?.observe(element)
    return () => {
      observer?.disconnect()
      root.style.removeProperty('--lesson-bar-height')
    }
  }, [])

  return (
    <nav ref={ref} className={styles.bar} aria-label="Lesson">
      <a href={back} className={styles.back}>
        ← Back to lesson
      </a>
      <span className={styles.title}>{lesson.title}</span>
      {finished && (
        <span className={styles.done} role="status">
          You've played this lesson's chapters. <a href={back}>Go to its checklist</a>
        </span>
      )}
    </nav>
  )
}
