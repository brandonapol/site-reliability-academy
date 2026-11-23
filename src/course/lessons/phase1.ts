import type { GameLesson } from '../types'

/**
 * Phase 1: First week at Inkwell, the existing feauxbernetes chapters, one lesson per week. Shared
 * by the Practitioner track (weeks 1–4) and Reliability for Everyone (module 1), by reference.
 *
 * The chapter mapping follows #15; a game save carries into course progress through `progress/fromGameSave.ts`. Checklists (#19), briefs (#20), the nines game
 * (#18) and the incident chapter (#16) are still to come.
 */

export const INKWELL_BOXES: GameLesson = {
  id: 'inkwell-boxes',
  title: 'Boxes, and what turns them back on',
  summary:
    'Your first day at Inkwell: what SRE is, the boxes that run things, writing down what you want, and watching a crashed copy come back by itself.',
  do: {
    kind: 'game',
    chapters: ['00-welcome', '01-boxes', '02-order-form', '03-self-heal'],
    summary: 'Play the welcome, boxes, order form and self-heal chapters.',
  },
  check: [],
  reading: [
    {
      title: 'Site Reliability Engineering, chapter 1: Introduction',
      href: 'https://sre.google/sre-book/introduction/',
      note: 'where the job came from and what an SRE team is for, now that you have done a day of it',
    },
  ],
}

export const INKWELL_CHANGE: GameLesson = {
  id: 'inkwell-change',
  title: 'How a change reaches production',
  summary:
    'Follow a merged change through GitOps and CI, break a build on purpose, and read the failure.',
  do: {
    kind: 'game',
    chapters: ['04-gitops', '05-ci', '06-wrap'],
    summary: 'Play the GitOps and CI chapters, then the end-of-week wrap-up.',
  },
  check: [],
}

export const INKWELL_MEASURE: GameLesson = {
  id: 'inkwell-measure',
  title: 'Seeing inside, and how good is good enough',
  summary:
    '"Is it working?" is an agreed number. Learn what an SLO is, what each nine costs, and why 100% is the wrong target.',
  do: {
    kind: 'game',
    chapters: ['ch6-seeing-inside', 'ch7-slo'],
    summary:
      'Play the seeing-inside and SLO chapters. The nines-versus-cost game joins them later.',
  },
  check: [],
  reading: [
    {
      title: 'Site Reliability Engineering, chapter 3: Embracing Risk',
      href: 'https://sre.google/sre-book/embracing-risk/',
      note: 'why 100% is the wrong target and how an error budget turns that into a rule, right after you have picked your first SLO',
    },
  ],
  keep: {
    title: 'Your first SLO',
    description: 'The SLO you chose for Inkwell checkout, from the options in the SLO chapter.',
  },
}

export const INKWELL_FIRST_PAGE: GameLesson = {
  id: 'inkwell-first-page',
  title: 'Alerts, and your first page',
  summary:
    'Alerts that wake a human only when users hurt, then a traffic spike, a database upgrade, and the pager in your hands.',
  do: {
    kind: 'game',
    chapters: ['ch8-alerts', 'bonus-traffic', 'bonus-database'],
    summary: 'Play the alerts chapter and the traffic and database chapters.',
  },
  check: [],
  keep: {
    title: 'Incident scorecard',
    description: 'How quickly you noticed, mitigated and explained your first incident.',
  },
}

export const PHASE_1_LESSONS = [INKWELL_BOXES, INKWELL_CHANGE, INKWELL_MEASURE, INKWELL_FIRST_PAGE]
