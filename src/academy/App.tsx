import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router'

import type { ProgressStore } from '../progress/store'
import { CourseMap } from './CourseMap'
import { Header } from './Header'
import { LessonPage } from './LessonPage'
import { NotFound } from './NotFound'
import { ProgressPage } from './ProgressPage'
import { ProgressProvider } from '../progress/react'

/** New page, new scroll position: start at the top, as a normal page load would. */
function ScrollToTop() {
  const { pathname } = useLocation()
  // Braces matter: newer Chromium returns a Promise from scrollTo, and an effect that returns a
  // non-function crashes React on cleanup ("destroy is not a function").
  useEffect(() => {
    window.scrollTo?.(0, 0)
  }, [pathname])
  return null
}

export function AcademyRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/course/practitioner" replace />} />
      <Route path="/course" element={<Navigate to="/course/practitioner" replace />} />
      <Route path="/course/:trackId" element={<CourseMap />} />
      <Route path="/lesson/:lessonId" element={<LessonPage />} />
      <Route path="/progress" element={<ProgressPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

/** The academy shell (index.html): landing, course map, lessons. The game lives on play.html. */
export function App({ store }: { store: ProgressStore }) {
  return (
    <ProgressProvider store={store}>
      <HashRouter>
        <ScrollToTop />
        <a
          href="#main"
          className="skip-link"
          onClick={(event) => {
            event.preventDefault()
            document.getElementById('main')?.focus()
          }}
        >
          Skip to content
        </a>
        <Header />
        <main id="main" tabIndex={-1} className="academy-main">
          <AcademyRoutes />
        </main>
      </HashRouter>
    </ProgressProvider>
  )
}
