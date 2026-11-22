import { PHASE_1_LESSONS } from './lessons/phase1'
import type { Track, Unit } from './types'

function module(
  number: number,
  title: string,
  activity: string,
  artifact: string,
  lessons: Unit['lessons'] = []
): Unit {
  return {
    id: `module-${String(number).padStart(2, '0')}`,
    kind: 'module',
    number,
    title,
    activity,
    artifact,
    tiers: ['browser'],
    lessons,
  }
}

/** Reliability for Everyone: nine browser-only modules and a capstone, from spec section 5. */
export const EVERYONE: Track = {
  id: 'everyone',
  title: 'Reliability for Everyone',
  audience: 'Product owners, managers, support, sales and business',
  length: '9 modules at 1–2 hours each',
  runsIn: 'Your browser only. You never type code, YAML or a command',
  outcomes: [
    'Explain an SLO and an error budget in your own words.',
    'Use an error budget to make a launch-or-fix decision.',
    'Play a useful non-engineering role in an incident.',
    'Read a postmortem.',
    'Know what to ask an SRE team for, and what to offer.',
  ],
  notice: 'ai-policy-everyone',
  phases: [
    {
      id: 'everyone-modules',
      title: 'Modules',
      span: 'Modules 1–9 and capstone',
      tiers: ['browser'],
      summary: 'One sitting each. Module 1 is the same first week at Inkwell the engineers play.',
      units: [
        module(
          1,
          'Your first week at Inkwell',
          'Play the first week at Inkwell',
          'How software gets to customers and stays up',
          PHASE_1_LESSONS
        ),
        module(
          2,
          'How reliable is reliable enough?',
          'Run a product for a simulated year, buying nines and seeing what they cost',
          'Why 100% is the wrong target'
        ),
        module(
          3,
          "Reliability from the customer's seat",
          'Sort user journeys by importance and pick what to measure for each',
          'SLIs, in plain words'
        ),
        module(
          4,
          'The budget',
          'Set an SLO, watch a quarter play out, spend and overspend the budget',
          'Error budgets as a spending decision'
        ),
        module(
          5,
          'Launch or fix?',
          'Play product owner across a quarter of trade-offs, with a policy to honour',
          'The error budget policy, and why it removes the argument'
        ),
        module(
          6,
          'In the incident room',
          'Play customer liaison and communications lead in a real incident',
          'Severity, roles, and status updates that help'
        ),
        module(
          7,
          'Afterwards',
          'Read a postmortem, rewrite blaming sentences, rank action items against a roadmap',
          'Blamelessness, and why follow-through is a product decision'
        ),
        module(
          8,
          'Working with SRE',
          'Choose an engagement model for three teams; read an on-call health report',
          'What to ask for and what to offer'
        ),
        module(
          9,
          'AI in the incident room',
          'Read three AI-written incident summaries and find the confident mistake',
          'What to expect from AI in incident response, and what to ask before trusting it'
        ),
        {
          id: 'everyone-capstone',
          kind: 'capstone',
          title: 'Capstone: your own SLO and error budget policy',
          activity: 'One page, for a product you actually work on, with a template and rubric',
          artifact: 'An SLO and error budget policy',
          tiers: ['browser'],
          lessons: [],
        },
      ],
    },
  ],
}
