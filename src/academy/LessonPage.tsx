import { useEffect, useId } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { findScenario } from '@sra/engine/decision/scenarios'
import { COURSE, findLesson, neighbors, placementFor, type Lesson, type TrackId } from '../course'
import { NinesGame } from '../features/nines'
import { target } from '../features/nines/format'
import { Markdown } from '../features/shared/Markdown'
import {
  setChecked,
  setComplete,
  setKeep,
  visitLesson,
  type LessonKeep,
} from '../progress/progress'
import { browserStorage } from '../progress/store'
import { lessonHref, playHref } from './links'
import { NotFound } from './NotFound'
import { TierBadges } from './parts'
import { useProgress, useProgressStore } from '../progress/react'

/** `#/lesson/:lessonId`: Watch, Do, Check, Keep (#41). */
export function LessonPage() {
  const { lessonId = '' } = useParams()
  const [search] = useSearchParams()
  const store = useProgressStore()
  const progress = useProgress()

  const lesson = findLesson(COURSE, lessonId)
  const requestedTrack = search.get('track') as TrackId | null
  const placement = placementFor(COURSE, lessonId, requestedTrack ?? progress.lastTrack)
  const trackId = placement?.track.id

  useEffect(() => {
    if (lesson) store.update((current) => visitLesson(current, lesson.id, trackId, new Date()))
  }, [lesson, trackId, store])

  if (!lesson || !placement) return <NotFound />

  const { track, phase, unit } = placement
  const { previous, next } = neighbors(track, lesson.id)
  const record = progress.lessons[lesson.id]
  const checked = new Set(record?.checked ?? [])
  const complete = Boolean(record?.completedAt)
  const unitName =
    unit.kind === 'capstone'
      ? 'Capstone'
      : `${unit.kind === 'week' ? 'Week' : 'Module'} ${unit.number}`

  return (
    <article className="lesson">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <ol>
          <li>
            <Link to={`/course/${track.id}`}>{track.title}</Link>
          </li>
          {track.phases.length > 1 && <li>{phase.title}</li>}
          <li aria-current="page">{unitName}</li>
        </ol>
      </nav>

      <h1>{lesson.title}</h1>
      <p className="lesson-summary">{lesson.summary}</p>

      <section aria-labelledby="watch">
        <h2 id="watch">Watch</h2>
        <Watch lesson={lesson} />
      </section>

      <section aria-labelledby="do">
        <h2 id="do">Do</h2>
        <p>
          <TierBadges tiers={unit.tiers} />
        </p>
        <DoPart lesson={lesson} trackId={track.id} />
      </section>

      <section aria-labelledby="check">
        <h2 id="check">Check</h2>
        <p>Before moving on, make sure you can do each of these.</p>
        {lesson.check.length === 0 ? (
          <p className="placeholder">The checklist for this lesson is still being written.</p>
        ) : (
          <ul className="checklist">
            {lesson.check.map((item) => (
              <CheckRow
                key={item.id}
                text={item.text}
                checked={checked.has(item.id)}
                onChange={(value) =>
                  store.update((current) =>
                    setChecked(current, lesson.id, item.id, value, new Date())
                  )
                }
              />
            ))}
          </ul>
        )}
        <button
          type="button"
          className={complete ? 'button button-secondary' : 'button'}
          aria-pressed={complete}
          onClick={() =>
            store.update((current) => setComplete(current, lesson.id, !complete, new Date()))
          }
        >
          {complete ? 'Completed. Mark as not done' : 'Mark lesson complete'}
        </button>
      </section>

      {lesson.keep && (
        <section aria-labelledby="keep">
          <h2 id="keep">Keep</h2>
          <h3>{lesson.keep.title}</h3>
          {record?.keep ? <Kept keep={record.keep} /> : <p>{lesson.keep.description}</p>}
        </section>
      )}

      {lesson.reading && lesson.reading.length > 0 && (
        <section aria-labelledby="reading">
          <h2 id="reading">Reading</h2>
          <ul>
            {lesson.reading.map((item) => (
              <li key={item.href}>
                <a href={item.href} target="_blank" rel="noreferrer">
                  {item.title}
                </a>
                {item.note && <> — {item.note}</>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav aria-label="Lessons" className="pager">
        {previous ? (
          <Link to={lessonHref(previous.id, track.id)} rel="prev">
            ← {previous.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link to={lessonHref(next.id, track.id)} rel="next">
            {next.title} →
          </Link>
        ) : (
          <Link to={`/course/${track.id}`}>Back to the course map</Link>
        )}
      </nav>
    </article>
  )
}

function Watch({ lesson }: { lesson: Lesson }) {
  // Videos arrive with the video epic (#2); until then the written brief stands in.
  if (lesson.brief) return <Markdown source={lesson.brief} className="brief" />
  return (
    <p className="placeholder">
      Video coming. Each lesson opens with about ten minutes on the idea, why it matters and one
      real story. Until it's recorded, go straight to Do.
    </p>
  )
}

function DoPart({ lesson, trackId }: { lesson: Lesson; trackId: TrackId }) {
  if (lesson.do.kind === 'text') return <p>{lesson.do.summary}</p>
  if (lesson.do.kind === 'simulation') {
    return (
      <SimulationPart
        lessonId={lesson.id}
        scenarioId={lesson.do.scenario}
        summary={lesson.do.summary}
      />
    )
  }
  return (
    <>
      <p>{lesson.do.summary}</p>
      <p>
        <a className="button" href={playHref(lesson.id, trackId)}>
          Play this lesson
        </a>
      </p>
      <p className="hint">
        The game works best on a laptop or desktop. It saves as you go, and a bar at the top brings
        you back here when you're done.
      </p>
    </>
  )
}

/** A decision simulation, played right here. The course validator guarantees the scenario exists. */
function SimulationPart({
  lessonId,
  scenarioId,
  summary,
}: {
  lessonId: string
  scenarioId: string
  summary: string
}) {
  const store = useProgressStore()
  const scenario = findScenario(scenarioId)
  const choice = scenario?.keep
  return (
    <>
      <p>{summary}</p>
      {scenario && (
        <NinesGame
          scenario={scenario}
          storage={browserStorage()}
          onKeep={(value) => {
            if (!choice) return
            const keep: LessonKeep = {
              kind: 'slo',
              sli: choice.sli,
              target: value,
              windowDays: choice.windowDays,
              chosenAt: new Date().toISOString(),
            }
            store.update((current) => setKeep(current, lessonId, keep, new Date()))
          }}
        />
      )}
    </>
  )
}

/** The Keep the learner made in this lesson. */
function Kept({ keep }: { keep: LessonKeep }) {
  const budget = (1 - keep.target) * keep.windowDays * 24 * 60
  return (
    <>
      <p className="kept">
        <strong>{target(keep.target)}</strong> of {keep.sli.toLowerCase()}, over {keep.windowDays}{' '}
        days.
      </p>
      <p className="hint">
        That leaves an error budget of about{' '}
        {budget < 1 ? `${Math.round(budget * 60)} seconds` : `${Number(budget.toFixed(1))} minutes`}{' '}
        of full outage in {keep.windowDays} days. Chosen{' '}
        {new Date(keep.chosenAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}. Play the
        game again to change it.
      </p>
    </>
  )
}

function CheckRow({
  text,
  checked,
  onChange,
}: {
  text: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const id = useId()
  return (
    <li>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <label htmlFor={id}>{text}</label>
    </li>
  )
}
