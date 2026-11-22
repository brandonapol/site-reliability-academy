import { Link, NavLink } from 'react-router'

import { continueHref } from './links'
import { useProgress } from '../progress/react'

export function Header() {
  const progress = useProgress()
  const resume = continueHref(progress)

  return (
    <header className="site-header">
      <Link to="/" className="site-name">
        Site Reliability Academy
      </Link>
      <nav aria-label="Site">
        <ul>
          <li>
            <NavLink to="/course/practitioner">Practitioner</NavLink>
          </li>
          <li>
            <NavLink to="/course/everyone">Reliability for Everyone</NavLink>
          </li>
          <li>
            <NavLink to="/progress">Your progress</NavLink>
          </li>
          {resume && (
            <li>
              <Link to={resume} className="button button-small">
                Continue
              </Link>
            </li>
          )}
        </ul>
      </nav>
    </header>
  )
}
