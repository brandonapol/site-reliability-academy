import {
  INKWELL_BOXES,
  INKWELL_CHANGE,
  INKWELL_FIRST_PAGE,
  INKWELL_MEASURE,
  INKWELL_NINES,
} from './lessons/phase1'
import type { Track, Unit } from './types'

/** Shorthand for a week from the spec's tables. */
function week(
  number: number,
  title: string,
  activity: string,
  tiers: Unit['tiers'],
  artifact?: string,
  lessons: Unit['lessons'] = []
): Unit {
  return {
    id: `week-${String(number).padStart(2, '0')}`,
    kind: 'week',
    number,
    title,
    activity,
    artifact,
    tiers,
    lessons,
  }
}

/** The Practitioner track: 28 weeks in six phases, from docs/curriculum.md section 4. */
export const PRACTITIONER: Track = {
  id: 'practitioner',
  title: 'Practitioner',
  audience: "New grads, and engineers who haven't done SRE",
  length: '28 weeks at 6–8 hours a week',
  runsIn: 'Browser, then a local cluster, then your own cloud account',
  outcomes: [
    'Trace a request through an unfamiliar system and draw it.',
    'Choose SLIs for a user journey, set an SLO, and write the error budget policy that goes with it.',
    'Instrument a service and build a dashboard and burn-rate alerts that page only when users are hurting.',
    'Take a page: triage, mitigate first, communicate, hand off, and explain the causal chain afterwards.',
    'Write a blameless postmortem with action items someone will actually do.',
    'Ship a change safely (canary, rollback) and automate a piece of toil.',
    'Reason about capacity, overload and failure domains in a design review, with numbers.',
    "Describe what healthy SRE culture looks like and spot when a team hasn't got it.",
  ],
  notice: 'ai-policy',
  phases: [
    {
      id: 'phase-1',
      title: 'First week at Inkwell',
      span: 'Weeks 1–4',
      tiers: ['browser'],
      summary: 'The whole job in miniature, before any tooling.',
      culture: 'Reliability is a feature, and 100% is the wrong target.',
      units: [
        week(
          1,
          'What SRE is: boxes, declarative state, self-healing',
          'Welcome, boxes, order form, self-heal',
          ['browser'],
          undefined,
          [INKWELL_BOXES]
        ),
        week(
          2,
          'How a change reaches production',
          'GitOps and CI. Break a build, read the failure',
          ['browser'],
          undefined,
          [INKWELL_CHANGE]
        ),
        week(
          3,
          'Seeing inside: SLOs, nines and error budgets',
          'Seeing inside, SLO, and a nines-versus-cost game',
          ['browser'],
          'First SLO, chosen from options',
          [INKWELL_MEASURE, INKWELL_NINES]
        ),
        week(
          4,
          'Alerts, and your first page',
          'Alerts, the incident, bonus traffic and database chapters',
          ['browser'],
          'Incident scorecard',
          [INKWELL_FIRST_PAGE]
        ),
      ],
    },
    {
      id: 'phase-2',
      title: 'Under the hood',
      span: 'Weeks 5–8',
      tiers: ['browser', 'local'],
      summary: 'The systems fundamentals the rest of the course assumes.',
      culture: 'Curiosity over procedure.',
      units: [
        week(
          5,
          'Linux for on-call, and Git beyond commit',
          "Simulated shell missions: find what's eating the disk, who's holding the port",
          ['browser']
        ),
        week(
          6,
          'Networking as a request sees it',
          '"Follow the packet": place the failure on the path from a set of symptoms',
          ['browser'],
          'A request-path diagram'
        ),
        week(
          7,
          'Containers and Kubernetes at working depth',
          'Install the lab. Deploy the storefront product. Break and fix probes and limits',
          ['local'],
          'Lab installed and verified'
        ),
        week(
          8,
          'Reverse-engineer a service',
          'Trace one request end to end through the ledger product',
          ['local'],
          'A system diagram, presented'
        ),
      ],
    },
    {
      id: 'phase-3',
      title: 'Measure',
      span: 'Weeks 9–13',
      tiers: ['browser', 'local'],
      summary: 'Observability and SLOs: the centre of the course.',
      culture: 'Data over opinion. The error budget as the incentive product and SRE share.',
      units: [
        week(
          9,
          'Observability versus monitoring',
          'Question detective: ten questions no existing dashboard answers, starting from traces',
          ['browser', 'local']
        ),
        week(
          10,
          'Instrumentation with OpenTelemetry',
          'Add a missing span and attributes, then find which customers a slow request affects',
          ['local'],
          'An instrumentation PR'
        ),
        week(
          11,
          'SLIs from user journeys',
          'The Art of SLOs workshop, adapted: journeys → SLIs → SLOs',
          ['browser'],
          'SLI specifications'
        ),
        week(
          12,
          'SLOs, error budgets and the error budget policy',
          'Implement SLOs as recording rules. Negotiate the policy with a simulated product owner',
          ['browser', 'local'],
          'An SLO document and an error budget policy'
        ),
        week(
          13,
          'Alerting on SLOs',
          'Tune burn-rate alerts against a month of replayed incidents',
          ['browser', 'local'],
          'Alert rules and a service dashboard'
        ),
      ],
    },
    {
      id: 'phase-4',
      title: 'Respond',
      span: 'Weeks 14–18',
      tiers: ['local'],
      summary: 'On-call, incidents, and learning from them.',
      culture: 'Blamelessness and sustainable on-call. No heroes; it is always fine to escalate.',
      notice: 'ai-policy-reminder',
      units: [
        week(
          14,
          'Being on-call',
          'Basic drills on all three products, with an expert narrating what to check',
          ['local'],
          'A runbook improvement'
        ),
        week(15, 'Troubleshooting as a method', 'Easy drills', ['local'], 'Timeline of one drill'),
        week(
          16,
          'Incident management',
          'A multi-role incident played as commander, then as comms',
          ['browser', 'local'],
          'Status updates and a handoff note'
        ),
        week(
          17,
          'Postmortems and learning from incidents',
          'Postmortem reading club, then write one for a week 15 drill',
          ['browser'],
          'A postmortem'
        ),
        week(
          18,
          'When the obvious explanation is wrong',
          'Medium drills, with reverse shadowing',
          ['local'],
          'Second postmortem'
        ),
      ],
    },
    {
      id: 'phase-5',
      title: 'Change and prevent',
      span: 'Weeks 19–23',
      tiers: ['local', 'cloud'],
      summary: 'Most outages come from change. Make change safe, and stop doing toil by hand.',
      culture: 'Eliminate toil, prefer simplicity. Hope is not a strategy.',
      units: [
        week(
          19,
          'Release engineering I',
          "Ship a bad release through a canary and watch it get caught, then one it can't catch",
          ['local'],
          'A rollout config'
        ),
        week(
          20,
          'Release engineering II: taking apps to production',
          'Stand up a cluster in your own account and promote three apps with SLO-gated canaries',
          ['cloud'],
          'A release pipeline, a release checklist, and a torn-down cluster'
        ),
        week(
          21,
          'Toil and automation',
          'A week of simulated tickets, then automate the worst one',
          ['local'],
          'An automation PR and a toil log'
        ),
        week(
          22,
          'Load and overload',
          'Load-test a product to its knee. Cause a retry storm, then fix it',
          ['local', 'cloud'],
          'A capacity note'
        ),
        week(
          23,
          'Testing for reliability',
          'Run one chaos experiment. Restore a database from backup against the clock',
          ['local', 'cloud'],
          'An experiment report'
        ),
      ],
    },
    {
      id: 'phase-6',
      title: 'Design, AI and graduation',
      span: 'Weeks 24–28',
      tiers: ['browser', 'local'],
      summary: 'Design with numbers, the wider job, your own AI SRE agent, and the capstone.',
      culture: 'How SRE fits an organization, and judgment stays with people.',
      notice: 'ai-policy-flip',
      units: [
        week(
          24,
          'Distributed systems for the working SRE',
          'Partition a cluster and predict what happens',
          ['browser']
        ),
        week(
          25,
          'Non-abstract large system design',
          'Design it, then size it with calculator-checked sums',
          ['browser'],
          'A design document'
        ),
        week(
          26,
          'The wider job',
          'Run a readiness review on the product released in week 20',
          ['browser', 'local'],
          'A readiness review'
        ),
        week(
          27,
          'AI for SRE',
          'Build your own AI SRE agent and test it on the week 18 drills',
          ['local'],
          'An agent and its eval results'
        ),
        week(
          28,
          'Capstone',
          'A hard drill by hand, then your agent investigates an unseen cascading failure',
          ['local', 'cloud'],
          "The on-call final exam, the agent's scorecard, and your review of its investigation"
        ),
      ],
    },
  ],
}
