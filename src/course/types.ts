/**
 * The course as plain data (#39): tracks → phases → units → lessons. Framework-free, like
 * `src/content`, so it can be validated and tested without a browser and read by both the academy
 * shell and the game page.
 *
 * **Lesson IDs are permanent.** Course progress is keyed by them (`src/progress`), so renaming one
 * silently loses every learner's progress on that lesson. Reorder, retitle or move lessons freely;
 * never change an `id`.
 */

import type { PolicyNotice } from './policy'

/** Where a lesson runs: the three tiers in docs/curriculum.md section 3. */
export type Tier = 'browser' | 'local' | 'cloud'

export type TrackId = 'practitioner' | 'everyone'

/** One "know before moving on" item. Its `id` is permanent within its lesson. */
export interface CheckItem {
  id: string
  text: string
}

/**
 * The interactive part of a lesson. New kinds (a simulation from the toolkit, a local lab) are
 * added here as their epics land.
 */
export type LessonDo =
  /** Feauxbernetes chapters, played on the game page, in order. IDs from `src/content/chapters`. */
  | { kind: 'game'; chapters: string[]; summary: string }
  /** Anything without a dedicated player yet: described in text. */
  | { kind: 'text'; summary: string }

export interface Lesson {
  /** Permanent, kebab-case, unique across the whole course. See the note at the top of this file. */
  id: string
  title: string
  /** One or two sentences: what the learner does and leaves with. */
  summary: string
  /** Watch: the written video brief, shown until a video exists (#2 adds the player). Markdown. */
  brief?: string
  do: LessonDo
  /** Check: the "know before moving on" list. May be empty while content is being written. */
  check: CheckItem[]
  /** Keep: the artifact the lesson produces, if it has one. */
  keep?: { title: string; description: string }
  /** Further reading, linked, never reproduced (see docs/authoring.md on licensing). */
  reading?: Array<{ title: string; href: string; note?: string }>
}

/** A lesson whose Do step is game chapters. */
export type GameLesson = Lesson & { do: Extract<LessonDo, { kind: 'game' }> }

/** A Practitioner week or a Reliability for Everyone module. */
export interface Unit {
  /** Permanent, like lesson IDs. */
  id: string
  kind: 'week' | 'module' | 'capstone'
  /** Week or module number as the spec gives it. Capstones have none. */
  number?: number
  title: string
  /** The activity, from the spec's tables. */
  activity: string
  /** The artifact the unit produces, from the spec's tables. */
  artifact?: string
  tiers: Tier[]
  /** Empty until the unit's content is written: shown as "coming soon". */
  lessons: Lesson[]
}

export interface Phase {
  id: string
  title: string
  /** e.g. "Weeks 1–4". */
  span: string
  tiers: Tier[]
  summary: string
  /** The phase's culture thread (spec section 6). */
  culture?: string
  /** Shown at the start of the phase, e.g. the AI policy reminder at Phase 4. */
  notice?: PolicyNotice
  units: Unit[]
}

export interface Track {
  id: TrackId
  title: string
  audience: string
  length: string
  runsIn: string
  /** What a graduate can do, from spec section 1. */
  outcomes: string[]
  /** Shown at the top of the track: the AI policy. */
  notice?: PolicyNotice
  phases: Phase[]
}

export interface Course {
  tracks: Track[]
}
