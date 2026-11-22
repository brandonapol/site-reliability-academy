import { Link, Navigate, NavLink, useParams } from 'react-router'

import { COURSE, findTrack, type Unit } from '../course'
import { groupStatus, lessonStatus } from '../progress/progress'
import { lessonHref } from './links'
import { StatusMark, TierBadges } from './parts'
import { PolicyNotice } from './PolicyNotice'
import { useProgress } from '../progress/react'

function unitLabel(unit: Unit): string {
  if (unit.kind === 'capstone') return 'Capstone'
  return `${unit.kind === 'week' ? 'Week' : 'Module'} ${unit.number}`
}

/** `#/course/:trackId`: the whole track, phase by phase, with the learner's progress (#42). */
export function CourseMap() {
  const { trackId = '' } = useParams()
  const progress = useProgress()
  const track = findTrack(COURSE, trackId)
  if (!track) return <Navigate to="/course/practitioner" replace />

  return (
    <article className="course-map">
      <nav aria-label="Tracks" className="track-switch">
        {COURSE.tracks.map((candidate) => (
          <NavLink key={candidate.id} to={`/course/${candidate.id}`}>
            {candidate.title}
          </NavLink>
        ))}
      </nav>

      <h1>{track.title}</h1>
      <dl className="track-facts">
        <div>
          <dt>For</dt>
          <dd>{track.audience}</dd>
        </div>
        <div>
          <dt>Length</dt>
          <dd>{track.length}</dd>
        </div>
        <div>
          <dt>Runs in</dt>
          <dd>{track.runsIn}</dd>
        </div>
      </dl>

      <details className="outcomes">
        <summary>What you'll be able to do</summary>
        <ul>
          {track.outcomes.map((outcome) => (
            <li key={outcome}>{outcome}</li>
          ))}
        </ul>
      </details>

      {track.notice && <PolicyNotice notice={track.notice} level={2} />}

      {track.phases.map((phase) => {
        const showPhaseHeading = track.phases.length > 1
        const lessons = phase.units.flatMap((unit) => unit.lessons)
        return (
          <section key={phase.id} className="phase" aria-labelledby={`${phase.id}-title`}>
            <h2
              id={`${phase.id}-title`}
              className={showPhaseHeading ? undefined : 'visually-hidden'}
            >
              {showPhaseHeading && <span className="phase-span">{phase.span}</span>}
              {phase.title}
              {lessons.length > 0 && <StatusMark status={groupStatus(progress, lessons)} />}
            </h2>
            <p className="phase-summary">
              {phase.summary} <TierBadges tiers={phase.tiers} />
            </p>
            {phase.culture && (
              <p className="culture">
                <strong>Culture thread:</strong> {phase.culture}
              </p>
            )}

            {phase.notice && <PolicyNotice notice={phase.notice} level={3} />}

            <ol className="units">
              {phase.units.map((unit) => (
                <li key={unit.id} className="unit">
                  <h3>
                    <span className="unit-label">{unitLabel(unit)}</span> {unit.title}
                  </h3>
                  <p className="unit-meta">
                    {unit.activity}. <TierBadges tiers={unit.tiers} />
                  </p>
                  {unit.artifact && (
                    <p className="unit-meta">
                      <strong>You keep:</strong> {unit.artifact}
                    </p>
                  )}
                  {unit.lessons.length === 0 ? (
                    <p className="coming-soon">Coming soon</p>
                  ) : (
                    <ul className="lessons">
                      {unit.lessons.map((lesson) => (
                        <li key={lesson.id}>
                          <StatusMark status={lessonStatus(progress, lesson.id)} />
                          <Link to={lessonHref(lesson.id, track.id)}>{lesson.title}</Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )
      })}
    </article>
  )
}
