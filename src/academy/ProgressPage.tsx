import { useState, type ChangeEvent } from 'react'

import { COURSE, lessonsOf } from '../course'
import { lessonStatus, parseProgress, serializeProgress } from '../progress/progress'
import { useProgress, useProgressStore } from '../progress/react'

/**
 * `#/progress`: a summary, plus export and import. There's no sign-in, so a file is the only way
 * to move progress to another browser (#40).
 */
export function ProgressPage() {
  const store = useProgressStore()
  const progress = useProgress()
  const [message, setMessage] = useState<string>()

  function exportFile() {
    const blob = new Blob([serializeProgress(progress)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'site-reliability-academy-progress.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const imported = parseProgress(await file.text())
    if (!imported) {
      setMessage("That file isn't a progress file this version of the academy can read.")
      return
    }
    store.replace(imported)
    setMessage('Progress imported.')
  }

  function clear() {
    if (window.confirm('Clear all your course progress in this browser? This can’t be undone.')) {
      store.clear()
      setMessage('Progress cleared.')
    }
  }

  return (
    <article>
      <h1>Your progress</h1>
      <p>
        Progress is saved in this browser only. There's no account. To move it to another browser or
        computer, export it here and import it there.
      </p>
      {store.discardedOnLoad && (
        <p className="notice" role="status">
          Your saved progress couldn't be read, so the academy started fresh. The old save is kept
          in this browser under <code>sra:progress:v1:discarded</code>.
        </p>
      )}
      {store.saveFailed && (
        <p className="notice" role="status">
          This browser isn't letting the academy save, so progress will be lost when you close the
          tab. Private browsing often does this.
        </p>
      )}

      <ul className="progress-summary">
        {COURSE.tracks.map((track) => {
          const lessons = lessonsOf(track)
          const done = lessons.filter((lesson) => lessonStatus(progress, lesson.id) === 'complete')
          return (
            <li key={track.id}>
              <strong>{track.title}:</strong> {done.length} of {lessons.length} lessons complete so
              far. More are being written.
            </li>
          )
        })}
      </ul>

      <div className="actions">
        <button type="button" className="button" onClick={exportFile}>
          Export progress
        </button>
        <label className="button button-secondary">
          Import progress
          <input
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            onChange={importFile}
          />
        </label>
        <button type="button" className="button button-danger" onClick={clear}>
          Clear progress
        </button>
      </div>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </article>
  )
}
