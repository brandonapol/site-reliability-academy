import type { DecisionScenario } from '../types'

// Every figure here is labeled (docs/design/nines-game.md → "The cost model"). Inkwell is made up,
// so its numbers are assumptions; the shape of the curve rests on the SRE book. Tests pin the
// ordering of strategies, not these amounts.

const CHANGE_MANAGEMENT = 'https://sre.google/sre-book/introduction/'

const MADE_UP = 'Inkwell is made up; a rough order of magnitude.'

/** Phase 1, week 3: six months at Inkwell's checkout, starting from the 99.9% `ch7-slo` chose. */
export const NINES_HALF_YEAR: DecisionScenario = {
  id: 'nines-half-year',
  title: 'Six months of nines',
  turns: 6,
  start: { level: '99.9' },
  levels: [
    {
      id: '99',
      label: '99%',
      target: 0.99,
      buys: 'One zone, fixes in business hours.',
      teamMonths: { value: 0, assumption: 'Where Inkwell started; nothing to build.' },
      runningCost: { value: 0, assumption: 'The baseline everything else is priced against.' },
      downtimeWithChange: {
        value: 432,
        assumption: 'A team running at a level roughly spends its error budget.',
      },
    },
    {
      id: '99.9',
      label: '99.9%',
      target: 0.999,
      buys: 'A second zone, automatic failover, an on-call rotation and burn-rate alerts.',
      teamMonths: { value: 1, assumption: MADE_UP },
      runningCost: { value: 5_000, assumption: MADE_UP },
      downtimeWithChange: {
        value: 43.2,
        assumption: 'A team running at a level roughly spends its error budget.',
      },
    },
    {
      id: '99.99',
      label: '99.99%',
      target: 0.9999,
      buys: 'A second region, a database replica with tested failover, canary releases and 24/7 on-call.',
      teamMonths: { value: 2, assumption: MADE_UP },
      runningCost: {
        value: 25_000,
        assumption: `${MADE_UP} Five times the nine below, gentler than the "may cost 100 times" in SRE book ch. 3.`,
      },
      downtimeWithChange: {
        value: 4.32,
        assumption: 'A team running at a level roughly spends its error budget.',
      },
    },
    {
      id: '99.999',
      label: '99.999%',
      target: 0.99999,
      buys: 'Active-active regions, a dedicated reliability team and regular failure drills.',
      teamMonths: { value: 4, assumption: MADE_UP },
      runningCost: {
        value: 125_000,
        assumption: `${MADE_UP} Five times the nine below, gentler than the "may cost 100 times" in SRE book ch. 3.`,
      },
      downtimeWithChange: {
        value: 0.432,
        assumption: 'A team running at a level roughly spends its error budget.',
      },
    },
    {
      id: '100',
      label: '100%',
      target: 1,
      buys: 'Everything above, plus no changes ever.',
      teamMonths: { value: 0, assumption: 'Takes the rest of the run: shipping stops.' },
      runningCost: {
        value: 125_000,
        assumption: 'The 99.999% setup; there is nothing more to buy.',
      },
      downtimeWithChange: {
        value: 0.432,
        assumption: 'The 99.999% setup underneath, which still fails sometimes.',
      },
      promise: true,
    },
  ],
  roadmap: [
    { id: 'shared-folders', name: 'Shared folders' },
    { id: 'comments', name: 'Comments' },
    { id: 'templates', name: 'Templates' },
    { id: 'offline-mode', name: 'Offline mode' },
    { id: 'export', name: 'Export' },
    { id: 'dark-mode', name: 'Dark mode' },
  ],
  economy: {
    subscribers: { value: 50_000, assumption: MADE_UP },
    price: { value: 10, assumption: MADE_UP },
    otherCosts: {
      value: 445_000,
      assumption: `${MADE_UP} Leaves about $55k a month before reliability spending, a 10% margin.`,
    },
    visitsPerSubscriber: { value: 30, assumption: MADE_UP },
    featureLift: { value: 0.01, assumption: MADE_UP },
    cancelRate: {
      value: 0.02,
      assumption:
        'The weakest number in the model: we found no good public figure for how many people cancel after a failure.',
    },
    ownSideFailureRate: {
      value: 0.001,
      assumption:
        'Chosen inside the 0.01% to 1% background error rate of an ISP that SRE book ch. 3 gives.',
    },
    noChangeDowntimeShare: { value: 0.3, source: CHANGE_MANAGEMENT },
  },
  events: [
    {
      id: 'dns',
      turn: 3,
      downtimeMinutes: {
        value: 3,
        assumption: 'A mistake at the domain registrar that no amount of redundancy prevents.',
      },
    },
  ],
  lines: {
    intro: {
      speaker: 'morgan',
      text: 'Checkout runs at 99.9%, the target we picked last week. For the next six months, you decide what the team works on. The report card after each month shows what it did to money, features, downtime, and the people using Inkwell.',
    },
    ask: { speaker: 'morgan', text: 'What does the team do this month?' },
    promiseWarning: {
      speaker: 'kai',
      text: 'A 100% promise leaves no error budget. The only way never to break checkout with a change is never to change anything, so nothing ships from here on. And our registrar, our cloud and our users’ Wi-Fi didn’t sign that promise. Still want to make it?',
    },
    frozenCard: {
      speaker: 'kai',
      text: 'Shipping is frozen. We promised 100%, and every change is a chance to break it.',
    },
    ship: {
      speaker: 'morgan',
      text: 'Shipped. Customers like it, and revenue picks up from next month.',
    },
    buyNine: {
      speaker: 'kai',
      text: 'The new setup is live. The team’s on it until it’s finished, so the roadmap waits.',
    },
    building: { speaker: 'kai', text: 'Still building. Nothing on the roadmap moved this month.' },
    dropNine: {
      speaker: 'morgan',
      text: 'Stepped down a nine. The running cost drops from next month. The time we spent building it is gone.',
    },
    promised: {
      speaker: 'kai',
      text: 'Promised. We’re running everything we have, and nobody ships anything.',
    },
    frozen: {
      speaker: 'taylor',
      text: 'Customers keep asking when comments are coming. I keep saying “not this month”.',
    },
    overBudget: {
      speaker: 'taylor',
      text: 'Checkout was down longer than our budget this month. My inbox noticed.',
    },
    ownSideDominates: {
      speaker: 'kai',
      text: 'Look at the two bars. Our users’ own phones and Wi-Fi failed them more than ten times as often as we did.',
    },
    'event.dns': {
      speaker: 'kai',
      text: 'A mistake at our domain registrar took us off the internet for three minutes. No nine we can buy stops that one.',
    },
    review: {
      speaker: 'morgan',
      text: 'Six months done. Here is what the team’s time and money bought.',
    },
  },
  cards: {
    ship: {
      title: 'Ship the next feature',
      description: 'Revenue grows from next month. A month with a change in it is riskier.',
    },
    buyNine: {
      title: 'Buy the next nine',
      description:
        'The new target takes effect at once, and the team builds it instead of features. In real life the new nine arrives when the work is done.',
    },
    dropNine: {
      title: 'Drop a nine',
      description:
        'Step back down. Running cost falls from next month. Time already spent is gone.',
    },
    promise100: {
      title: 'Promise 100%',
      description: 'Never fail a checkout. Kai has something to say first.',
    },
    hold: {
      title: 'Keep going',
      description: 'The team carries on with what it is doing.',
    },
  },
  keep: {
    sli: 'Checkouts that succeed within 2 seconds',
    windowDays: 30,
    question: { speaker: 'kai', text: 'So what do we promise for checkout?' },
    options: [
      {
        level: '99',
        accepted: true,
        reply: {
          speaker: 'kai',
          text: 'Seven hours a month is a lot of room. Cheap, but Taylor’s inbox will feel it. If the complaints pile up, we revisit it.',
        },
      },
      {
        level: '99.9',
        accepted: true,
        reply: {
          speaker: 'kai',
          text: 'That’s where users stop noticing us next to their own Wi-Fi, and the team still ships. If the business changes, so can this.',
        },
      },
      {
        level: '99.99',
        accepted: true,
        reply: {
          speaker: 'kai',
          text: 'You saw what 99.99% cost us in features and money. If a customer ever needs it in a contract, we’ll revisit.',
        },
      },
      {
        level: '99.999',
        accepted: true,
        reply: {
          speaker: 'kai',
          text: 'Users can’t tell that from 99.99% through their own Wi-Fi, and it costs five times as much. I’ll write it down, but bring the ledger to the next review.',
        },
      },
      {
        level: '100',
        accepted: false,
        reply: {
          speaker: 'kai',
          text: 'An SLO needs an error budget, and 100% has none. One bad DNS change and we’ve broken our promise, with no room to ship anything. Pick a number we can keep.',
        },
      },
    ],
  },
}
