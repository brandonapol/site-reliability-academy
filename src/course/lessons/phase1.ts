import type { GameLesson } from '../types'
import BOXES_BRIEF from './briefs/inkwell-boxes.md?raw'
import CHANGE_BRIEF from './briefs/inkwell-change.md?raw'
import FIRST_PAGE_BRIEF from './briefs/inkwell-first-page.md?raw'
import MEASURE_BRIEF from './briefs/inkwell-measure.md?raw'

/**
 * Phase 1: First week at Inkwell, the existing feauxbernetes chapters, one lesson per week. Shared
 * by the Practitioner track (weeks 1–4) and Reliability for Everyone (module 1), by reference.
 *
 * The chapter mapping follows #15; a game save carries into course progress through `progress/fromGameSave.ts`. Briefs (#20), the nines game
 * (#18) and the incident chapter (#16) are still to come.
 */

export const INKWELL_BOXES: GameLesson = {
  id: 'inkwell-boxes',
  title: 'Boxes, and what turns them back on',
  summary:
    'Your first day at Inkwell: what SRE is, the boxes that run things, writing down what you want, and watching a crashed copy come back by itself.',
  brief: BOXES_BRIEF,
  do: {
    kind: 'game',
    chapters: ['00-welcome', '01-boxes', '02-order-form', '03-self-heal'],
    summary: 'Play the welcome, boxes, order form and self-heal chapters.',
  },
  check: [
    {
      id: 'the-job',
      text: "Say in one sentence what Inkwell's engineers do, and what the platform team does",
      from: '00-welcome/the-job',
    },
    {
      id: 'why-copies',
      text: 'Explain why an app runs as several copies spread across boxes',
      from: '01-boxes/count-box-b',
    },
    {
      id: 'name-the-parts',
      text: 'Name what engineers call a box, a copy, and all the boxes together',
      from: '01-boxes/boxes-view',
    },
    {
      id: 'database-dragon',
      text: 'Say why the database is not treated like a disposable copy',
      from: '01-boxes/database-tile',
    },
    {
      id: 'wish-not-steps',
      text: 'Describe a wish (which app, which version, how many copies) and how it differs from a list of steps',
      from: '02-order-form/make-it-so',
    },
    {
      id: 'copy-comes-back',
      text: 'Explain why a copy comes back after you unplug it, without the word "reconcile"',
      from: '03-self-heal/unplug',
    },
  ],
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
  brief: CHANGE_BRIEF,
  do: {
    kind: 'game',
    chapters: ['04-gitops', '05-ci', '06-wrap'],
    summary: 'Play the GitOps and CI chapters, then the end-of-week wrap-up.',
  },
  check: [
    {
      id: 'source-of-truth',
      text: 'Say where the real wish lives once GitOps is on, and what makes the cluster match it',
      from: '04-gitops/merge-it',
    },
    {
      id: 'console-change-reverts',
      text: 'Explain why a change made straight in the Ops Console disappears',
      from: '04-gitops/drift',
    },
    {
      id: 'pr-to-running',
      text: 'Trace a change from pull request to running copies, one step at a time',
      from: '04-gitops/watch-deploy',
    },
    {
      id: 'read-failing-test',
      text: 'Read a failing end-to-end test and say what a customer would have seen',
      from: '05-ci/what-wrong',
    },
    {
      id: 'keep-the-test',
      text: 'Explain why deleting a failing test is worse than fixing the code it caught',
      from: '05-ci/suggest-fix',
    },
  ],
}

export const INKWELL_MEASURE: GameLesson = {
  id: 'inkwell-measure',
  title: 'Seeing inside, and how good is good enough',
  summary:
    '"Is it working?" is an agreed number. Learn what an SLO is, what each nine costs, and why 100% is the wrong target.',
  brief: MEASURE_BRIEF,
  do: {
    kind: 'game',
    chapters: ['ch6-seeing-inside', 'ch7-slo'],
    summary:
      'Play the seeing-inside and SLO chapters. The nines-versus-cost game joins them later.',
  },
  check: [
    {
      id: 'golden-signals',
      text: 'Name the four golden signals in plain words: how slow, how busy, how many errors, how full',
      from: 'ch6-seeing-inside/name-signals',
    },
    {
      id: 'symptom-to-signal',
      text: 'Given a symptom, say which golden signal shows it, then find it in the logs',
      from: 'ch6-seeing-inside/match-signal',
    },
    {
      id: 'sli-not-cpu',
      text: 'Explain why successful checkouts make an SLI and CPU does not',
      from: 'ch7-slo/choose-sli',
    },
    {
      id: 'slo-parts',
      text: 'State an SLO as a target plus a window',
      from: 'ch7-slo/choose-target',
    },
    {
      id: 'not-100',
      text: 'Explain why 100% is the wrong target for checkout, and who pays for each extra nine',
      from: 'ch7-slo/choose-target',
    },
    {
      id: 'low-budget',
      text: 'Say what the team does when the error budget runs low, and why',
      from: 'ch7-slo/budget-policy',
    },
  ],
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
  brief: FIRST_PAGE_BRIEF,
  do: {
    kind: 'game',
    chapters: ['ch8-alerts', '09-the-page', 'bonus-traffic', 'bonus-database'],
    summary:
      'Play the alerts chapter, take your first page, then the traffic and database chapters.',
  },
  check: [
    {
      id: 'ack-first',
      text: 'Say why you acknowledge a page before you understand it',
      from: '09-the-page/ack',
    },
    {
      id: 'roll-back-first',
      text: 'Explain why rolling back comes before finding the bug, while customers are failing',
      from: '09-the-page/stop-bleeding',
    },
    {
      id: 'clear-status-update',
      text: 'Write a status update a customer can act on: no jargon, no blame',
      from: '09-the-page/post-update',
    },
    {
      id: 'burn-rate',
      text: 'Say why a burn-rate rule pages for the real outage but stays quiet on a blip',
      from: 'ch8-alerts/pick-rule',
    },
    {
      id: 'page-ticket-dashboard',
      text: 'Sort a signal into page, ticket or dashboard, and say why',
      from: 'ch8-alerts/sort',
    },
    {
      id: 'database-timing',
      text: 'Say when to upgrade the database, and why not during the sale or at 5pm on a Friday',
      from: 'bonus-database/when',
    },
  ],
  keep: {
    title: 'Incident scorecard',
    description: 'How quickly you noticed, mitigated and explained your first incident.',
  },
}

export const PHASE_1_LESSONS = [INKWELL_BOXES, INKWELL_CHANGE, INKWELL_MEASURE, INKWELL_FIRST_PAGE]
