import { Link } from 'react-router'

export function NotFound() {
  return (
    <article>
      <h1>Page not found</h1>
      <p>
        That page doesn't exist, or it moved. The <Link to="/course/practitioner">course map</Link>{' '}
        has everything.
      </p>
    </article>
  )
}
