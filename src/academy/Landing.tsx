import { Link } from 'react-router'

import { COURSE, lessonsOf } from '../course'
import { lessonHref } from './links'

/**
 * `#/`: what the academy is, what it costs, and where to start (#44). The cost statement comes
 * first, before anything asks for time or commitment (spec section 2).
 */
export function Landing() {
  return (
    <article className="landing">
      <h1>Learn Site Reliability Engineering by doing the job</h1>
      <p className="lede">
        A free, self-paced course. Start as a new hire at a made-up company called Inkwell, and
        finish holding the pager for a system you've learned to measure, fix and improve.
      </p>

      <section className="cost" aria-labelledby="cost-title">
        <h2 id="cost-title">What it costs</h2>
        <ul>
          <li>
            <strong>The course is free.</strong> Every lesson, game and lab. The academy never takes
            payment.
          </li>
          <li>
            <strong>The only spend is your own cloud account</strong>, for the Practitioner labs in
            weeks 20–28. Expect around <strong>$10</strong>. You'll stay <strong>under $100</strong>{' '}
            as long as you tear down after each lab, and the course checks that you do.
          </li>
          <li>
            <strong>You can finish without paying anything.</strong> Week 20, the one lab that needs
            the cloud, also has a version that runs on your laptop.
          </li>
        </ul>
        <p className="hint">
          The dollar figures are estimates and will be checked against the cloud provider's own
          prices before the cloud weeks open.
        </p>
      </section>

      <section aria-labelledby="tracks-title">
        <h2 id="tracks-title">Two tracks</h2>
        <div className="track-cards">
          {COURSE.tracks.map((track) => {
            const first = lessonsOf(track)[0]
            return (
              <section key={track.id} className="track-card" aria-labelledby={`${track.id}-card`}>
                <h3 id={`${track.id}-card`}>{track.title}</h3>
                <p>
                  <strong>For:</strong> {track.audience}.
                </p>
                <p>
                  <strong>Length:</strong> {track.length}.
                </p>
                <p>
                  <strong>Runs in:</strong> {track.runsIn}.
                </p>
                <p className="card-actions">
                  {first && (
                    <Link className="button" to={lessonHref(first.id, track.id)}>
                      Start {track.id === 'practitioner' ? 'week 1' : 'module 1'}
                    </Link>
                  )}
                  <Link to={`/course/${track.id}`}>See the whole track</Link>
                </p>
              </section>
            )
          })}
        </div>
        <p>
          Both tracks start with the same first week at Inkwell and meet the same incidents from
          different seats. A product owner and an engineer who both finish can sit in the same SLO
          review and understand each other.
        </p>
      </section>

      <section aria-labelledby="how-title">
        <h2 id="how-title">How it works</h2>
        <ul>
          <li>
            Each lesson opens with a short video on the idea, then you <em>do</em> it: a game, a
            simulation or a lab. You check yourself before moving on, and most lessons leave you
            with something to keep, like an SLO, a dashboard or a postmortem.
          </li>
          <li>
            There's no account. Your progress is saved in this browser, and you can export it from{' '}
            <Link to="/progress">Your progress</Link>.
          </li>
        </ul>
      </section>
    </article>
  )
}
