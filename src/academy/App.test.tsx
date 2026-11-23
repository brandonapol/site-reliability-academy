import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import type { Lesson } from '../course'
import { INKWELL_BOXES } from '../course/lessons/phase1'
import { lessonStatus, PROGRESS_KEY } from '../progress/progress'
import { createProgressStore, type StorageLike } from '../progress/store'
import { App } from './App'

function memoryStorage(): StorageLike {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  }
}

function renderAt(hash: string, storage: StorageLike = memoryStorage()) {
  window.location.hash = hash
  const store = createProgressStore(storage)
  const view = render(<App store={store} />)
  return { store, storage, ...view }
}

/** Temporarily gives a Phase 1 lesson a checklist, as #19 will. */
function withChecklist(lesson: Lesson, run: () => Promise<void>) {
  const original = lesson.check
  lesson.check = [
    { id: 'explain-self-heal', text: 'Explain why an unplugged copy comes back' },
    {
      id: 'desired-vs-actual',
      text: 'Say the difference between what you asked for and what runs',
    },
  ]
  return run().finally(() => {
    lesson.check = original
  })
}

describe('the landing page', () => {
  it('states the cost first, and starts either track', () => {
    renderAt('#/')
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings[0]).toBe('What it costs')
    expect(screen.getByText(/The course is free/)).toBeInTheDocument()
    expect(screen.getByText(/academy never takes/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start week 1' })).toHaveAttribute(
      'href',
      '#/lesson/inkwell-boxes?track=practitioner'
    )
    expect(screen.getByRole('link', { name: 'Start module 1' })).toHaveAttribute(
      'href',
      '#/lesson/inkwell-boxes?track=everyone'
    )
  })
})

describe('the AI policy', () => {
  it('opens the Practitioner track and returns at Phase 4 and Phase 6', () => {
    renderAt('#/course/practitioner')
    expect(
      screen.getByRole('complementary', { name: 'Please do the exercises without AI assistants' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('complementary', { name: 'A reminder before you take the pager' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('complementary', { name: 'Weeks 27–28: AI on, deliberately' })
    ).toBeInTheDocument()
  })

  it('has a gentler version for Reliability for Everyone', () => {
    renderAt('#/course/everyone')
    expect(
      screen.getByRole('complementary', { name: 'A note on AI assistants' })
    ).toBeInTheDocument()
  })
})

describe('the course map', () => {
  it('shows every Practitioner week, with unwritten ones marked coming soon', () => {
    renderAt('#/course/practitioner')
    expect(screen.getByRole('heading', { level: 1, name: 'Practitioner' })).toBeInTheDocument()
    for (let week = 1; week <= 28; week++) {
      expect(screen.getByText(`Week ${week}`)).toBeInTheDocument()
    }
    expect(screen.getAllByText('Coming soon').length).toBe(24)
    expect(screen.getByRole('link', { name: INKWELL_BOXES.title })).toBeInTheDocument()
  })

  it('switches to Reliability for Everyone, which shares the first week', async () => {
    renderAt('#/course/practitioner')
    const tracks = screen.getByRole('navigation', { name: 'Tracks' })
    await userEvent.click(within(tracks).getByRole('link', { name: 'Reliability for Everyone' }))
    expect(
      screen.getByRole('heading', { level: 1, name: 'Reliability for Everyone' })
    ).toBeInTheDocument()
    for (let module = 1; module <= 9; module++) {
      expect(screen.getByText(`Module ${module}`)).toBeInTheDocument()
    }
    expect(screen.getByText('Capstone')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: INKWELL_BOXES.title })).toHaveAttribute(
      'href',
      '#/lesson/inkwell-boxes?track=everyone'
    )
  })

  it('redirects an unknown track to the Practitioner map', () => {
    renderAt('#/course/nope')
    expect(screen.getByRole('heading', { level: 1, name: 'Practitioner' })).toBeInTheDocument()
  })
})

describe('a lesson', () => {
  it('renders Watch, Do and Check, and launches the game for its chapters', () => {
    renderAt('#/lesson/inkwell-boxes?track=practitioner')
    expect(screen.getByRole('heading', { level: 1, name: INKWELL_BOXES.title })).toBeInTheDocument()
    for (const part of ['Watch', 'Do', 'Check']) {
      expect(screen.getByRole('heading', { level: 2, name: part })).toBeInTheDocument()
    }
    expect(screen.queryByRole('heading', { level: 2, name: 'Keep' })).not.toBeInTheDocument()
    // No video yet, so the written brief stands in.
    expect(screen.getByRole('heading', { level: 3, name: 'The one thing' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: "AWS's summary of the April 2011 event" })
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Play this lesson' })).toHaveAttribute(
      'href',
      '/play.html?lesson=inkwell-boxes&track=practitioner'
    )
  })

  it('shows Keep when the lesson has an artifact', () => {
    renderAt('#/lesson/inkwell-first-page')
    expect(screen.getByRole('heading', { level: 2, name: 'Keep' })).toBeInTheDocument()
    expect(screen.getByText('Incident scorecard')).toBeInTheDocument()
  })

  it('keeps ticked checklist items after a reload', () =>
    withChecklist(INKWELL_BOXES, async () => {
      const { storage, unmount } = renderAt('#/lesson/inkwell-boxes')
      await userEvent.click(
        screen.getByRole('checkbox', { name: 'Explain why an unplugged copy comes back' })
      )
      unmount()

      renderAt('#/lesson/inkwell-boxes', storage)
      expect(
        screen.getByRole('checkbox', { name: 'Explain why an unplugged copy comes back' })
      ).toBeChecked()
      expect(screen.getByRole('checkbox', { name: /Say the difference/ })).not.toBeChecked()
      expect(storage.getItem(PROGRESS_KEY)).toContain('explain-self-heal')
    }))

  it('marks complete, and the course map shows it without a reload', async () => {
    const { store } = renderAt('#/lesson/inkwell-boxes?track=practitioner')
    await userEvent.click(screen.getByRole('button', { name: 'Mark lesson complete' }))
    expect(lessonStatus(store.get(), 'inkwell-boxes')).toBe('complete')

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    await userEvent.click(within(breadcrumb).getByRole('link', { name: 'Practitioner' }))
    const link = screen.getByRole('link', { name: INKWELL_BOXES.title })
    expect(link.parentElement).toHaveTextContent('Complete')
  })

  it('links to the next lesson in the same track, and offers Continue afterwards', async () => {
    renderAt('#/lesson/inkwell-boxes?track=practitioner')
    await userEvent.click(screen.getByRole('link', { name: /How a change reaches production/ }))
    expect(
      screen.getByRole('heading', { level: 1, name: 'How a change reaches production' })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute(
      'href',
      '#/lesson/inkwell-change?track=practitioner'
    )
  })

  it('says so for a lesson that does not exist', () => {
    renderAt('#/lesson/nope')
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
  })
})

describe('the progress page', () => {
  it('summarizes progress per track', async () => {
    const { store } = renderAt('#/progress')
    expect(screen.getByText(/Practitioner:/).parentElement).toHaveTextContent('0 of 4 lessons')
    store.update((p) => ({
      ...p,
      lessons: { 'inkwell-boxes': { checked: [], completedAt: '2026-11-21T00:00:00Z' } },
    }))
    expect(await screen.findByText(/Practitioner:/)).toBeInTheDocument()
    expect(screen.getByText(/Practitioner:/).parentElement).toHaveTextContent('1 of 4 lessons')
    expect(screen.getByText(/Reliability for Everyone:/).parentElement).toHaveTextContent(
      '1 of 4 lessons'
    )
  })
})
