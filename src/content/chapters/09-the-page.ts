import type { ClusterState } from '@sra/engine/cluster'
import type { GameEvent } from '@sra/engine/events'
import type { GameState } from '@sra/engine/game'
import {
  approvePR,
  DEPLOY_REPO,
  mergePR,
  openPR,
  sync,
  tick as argoTick,
  type GitOpsState,
} from '@sra/engine/gitops'
import { createIncidentState } from '@sra/engine/incident'
import type { Chapter, Effect, Reaction } from '@sra/engine/story/types'
import { incidentChannelId } from '../channels'
import { INCIDENT_CONTENT } from '../incident'
import { kaiNudge, startingWorld } from './helpers'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

/** Friday 18 September 2026, 14:03 UTC: the learner's first shift as primary on-call. */
const FRIDAY_AFTERNOON = Date.UTC(2026, 8, 18, 14, 3, 0) / 1000

/** The channel `declare` creates: the first incident of the game, for billing. */
const INC = incidentChannelId(1, INCIDENT_CONTENT.slugs.billing)

const BAD = '2.4.1'
const GOOD = '2.4.0'

/**
 * Alex's coupon change, as Ch 9 finds it: billing ran 2.4.0 all week (so Argh CD's History has
 * something to roll back to), then Alex's deploy-repo PR to 2.4.1 merged and Argh CD auto-synced
 * it two minutes ago ("14:01"). The copies are given time to finish swapping, so the cluster
 * really is running the bad version when the page lands.
 */
function deployCouponChange(
  gitops: GitOpsState,
  cluster: ClusterState,
  now: number
): { gitops: GitOpsState; cluster: ClusterState; prId: string } {
  const monday = sync(gitops, cluster, 'billing', now - 2 * HOUR)
  const mergeAt = now - 2 * MINUTE - gitops.config.autoSyncDelayMs
  const withVersion: GitOpsState = {
    ...monday.gitops,
    appRepos: {
      ...monday.gitops.appRepos,
      billing: {
        app: 'billing',
        versions: [
          ...(monday.gitops.appRepos.billing?.versions ?? []),
          {
            version: BAD,
            author: 'alex',
            summary: 'Coupon codes at checkout.',
            behaviour: { couponDoubleDiscount: true },
          },
        ],
      },
    },
  }
  const opened = openPR(
    withVersion,
    {
      repo: DEPLOY_REPO,
      title: `billing ${BAD}: coupon codes at checkout`,
      author: 'alex',
      change: { kind: 'wish', app: 'billing', wish: { app: 'billing', version: BAD, copies: 2 } },
      reviewers: ['kai'],
    },
    mergeAt - 10 * MINUTE
  )
  const prId = opened.pullRequest.id
  const merged = mergePR(approvePR(opened.gitops, prId, 'kai'), prId, mergeAt)
  let next = { gitops: merged.gitops, cluster: monday.cluster }
  for (let t = mergeAt; t <= now; t += 1000) {
    const ticked = argoTick(next.gitops, next.cluster, t)
    next = { gitops: ticked.gitops, cluster: ticked.cluster }
  }
  return { ...next, prId }
}

/** Alex's PR id is deterministic: the same setup always produces it. */
const ALEX_PR = (() => {
  const world = startingWorld({ clock: { now: 0 } } as GameState)
  return deployCouponChange(world.gitops, world.cluster, FRIDAY_AFTERNOON).prId
})()

const ALEX_PR_LINK = `#/gitnub/${DEPLOY_REPO}/pull/${ALEX_PR}`

function say(from: string, text: string, id?: string, channel = INC): Effect {
  return { type: 'flackMessage', channel, from, text, ...(id ? { id } : {}) }
}

function kai(text: string): Effect {
  return say('kai', text, undefined, 'dm-kai')
}

function hypothesis(text: string, verdict: string): Effect[] {
  return [
    { type: 'incident', command: { kind: 'hypothesis', text: `${text} ${verdict}` } },
    say('player', `**${text}** ${verdict}`),
  ]
}

/** A wrong mitigation: time passes (and the counter climbs) while it doesn't work. */
function costly(optionId: string, minutes: number, tried: string): Reaction {
  return {
    id: `costs-${optionId}`,
    when: (_state, event) =>
      event.type === 'optionChosen' &&
      event.stepId === 'stop-bleeding' &&
      event.optionId === optionId,
    effects: [
      { type: 'passTime', ms: minutes * MINUTE },
      { type: 'incident', command: { kind: 'mitigation', text: `${tried} It didn't help.` } },
    ],
  }
}

/** The learner posted one of the status composer's updates (or Show me's target was clicked). */
function posted(optionId: string) {
  return (state: GameState, event: GameEvent) =>
    (event.type === 'targetClicked' && event.targetId === `status-option:${optionId}`) ||
    (event.type === 'incidentRecorded' &&
      event.entry.kind === 'statusPosted' &&
      Boolean(state.incident.current?.statusPosts.some((post) => post.optionId === optionId)))
}

/** Kai's take when the learner posts a weaker update from the composer. */
function weakUpdate(stage: 'monitoring' | 'resolved', optionId: string): Reaction {
  const option = INCIDENT_CONTENT.statusUpdates[stage].find((o) => o.id === optionId)
  return {
    id: `weak-${optionId}`,
    when: (_state, event) =>
      event.type === 'targetClicked' && event.targetId === `status-option:${optionId}`,
    effects: [kai(`${option?.note ?? ''} You can post a better one right after.`)],
  }
}

/** Kai's take on Argh CD's own Rollback button, if the learner reaches for it mid-incident. */
const ARGH_BOUNCE: Reaction = {
  id: 'argh-rollback',
  when: (_state, event) => event.type === 'appRolledBack' && event.app === 'billing',
  effects: [
    kai(
      `Watch billing in Argh CD for a minute. GitNub still says ${BAD}, and Argh CD's whole job is making the cluster match GitNub, so it will put ${BAD} right back. To make an undo stick, change GitNub: revert Alex's PR.`
    ),
  ],
}

const billingFixed = (state: GameState) => state.cluster.wishes.billing?.version === GOOD

const nudgeIsItReal = kaiNudge(
  'is-it-real',
  'Look at the Errors chart, the right-hand end. Is it up, and did it stay up?'
)
const nudgeDeploy = kaiNudge(
  'h-deploy',
  'In Argh CD, open billing. History lists every version it ran and when. Compare that time with when errors started.'
)
const nudgeBleeding = kaiNudge(
  'stop-bleeding',
  'Which option gets customers back to something that worked, fastest? Finding the bug can wait.'
)
const nudgeRevert = kaiNudge(
  'revert',
  `Open Alex's pull request in GitNub and look under the merge box: there's a Revert button.`
)

export const thePageChapter: Chapter = {
  id: '09-the-page',
  title: 'The page',
  milestone: 'm3',
  intro:
    'Friday afternoon. Your name is on the on-call schedule for the first time. Kai is one DM away. Nothing ever happens on a Friday afternoon. (Everyone says that.)',
  setup: (state) => {
    const world = startingWorld(state)
    const now = Math.max(state.clock.now, FRIDAY_AFTERNOON)
    const deployed = deployCouponChange(world.gitops, world.cluster, now)
    return {
      ...world,
      clock: { now },
      cluster: deployed.cluster,
      gitops: deployed.gitops,
      incident: createIncidentState(),
      statusPage: { updates: [] },
      ui: {
        ...world.ui,
        activeTab: 'flack',
        overlay: undefined,
        unlockedTabs: ['flack', 'inkwell', 'arghcd', 'gitnub', 'grafauxna', 'pagerdoody'],
        gitOpsEnforced: true,
      },
      flack: {
        ...world.flack,
        activeChannel: 'platform',
        dynamicChannels: [],
        messages: world.flack.messages.filter((message) => !message.channel.startsWith('inc-')),
      },
    }
  },
  steps: [
    {
      id: 'on-call',
      title: 'Check the schedule',
      body: 'You’re primary `on-call` today. While it’s quiet, open **PagerDoody** and find your name on the schedule.',
      hints: ['PagerDoody is the last tab in the strip.'],
      thinking:
        'Friday, 2pm. My name is on the schedule. It’s fine. Kai is one message away. I’ll just double-check where everything is.',
      solution: { type: 'openTab', tab: 'pagerdoody' },
      goal: (_state, event) => event.type === 'tabOpened' && event.tab === 'pagerdoody',
      onEnter: [
        say(
          'alex',
          `Coupon codes are live at checkout! 🎉 billing ${BAD} just went out. Try SAVE10.`,
          'alex-coupons',
          'platform'
        ),
        kai('Quiet Friday so far. Shout if anything buzzes. I’m right here.'),
      ],
      onComplete: [
        {
          type: 'incident',
          command: {
            kind: 'page',
            service: 'billing',
            text: 'billing: checkout error budget burning 14.4× too fast. SEV2.',
          },
        },
        {
          type: 'flackMessage',
          channel: 'alerts',
          from: 'pagerdoody',
          text: 'Paging {{player.name}}: billing checkout is spending its error budget 14.4× too fast.',
          card: {
            title: 'billing: checkout error budget burning 14.4× too fast',
            fields: [
              { label: 'Severity', value: 'SEV2' },
              { label: 'Service', value: 'billing' },
              { label: 'Since', value: '14:02' },
            ],
            href: '#/grafauxna',
            linkLabel: 'Open the billing dashboard',
          },
        },
      ],
    },
    {
      id: 'ack',
      title: 'Acknowledge the page',
      body: 'That’s a `page`. Click **Acknowledge**. It tells everyone someone is on it, and stops it from waking the next person.',
      hints: [
        'The page is the box that popped up over the browser. Acknowledge is the big button.',
      ],
      thinking:
        'My phone is buzzing. Heart rate: up. Step one isn’t fixing it. Step one is saying “mine” so nobody wonders whether anyone is on it. Ack first, think second.',
      solution: { type: 'clickTarget', targetId: 'page-ack' },
      goal: (_state, event) =>
        (event.type === 'targetClicked' && event.targetId === 'page-ack') ||
        (event.type === 'incidentRecorded' && event.entry.kind === 'acked'),
      onComplete: [{ type: 'incident', command: { kind: 'ack' } }, { type: 'closeOverlay' }],
      afterNote:
        'The counter at the top started when the page landed: customers who couldn’t pay. **Pause** stops the clock whenever you need a breath to read.',
    },
    {
      id: 'open-dashboard',
      title: 'Is it real? Open the dashboard',
      body: 'Pages can be wrong. Open **Grafauxna** to see billing’s dashboard for yourself.',
      hints: ['The page in #alerts links straight to it, or use the Grafauxna tab.'],
      thinking:
        'Pages lie sometimes. Before I pull anyone else in, I want to see it with my own eyes.',
      solution: { type: 'openTab', tab: 'grafauxna' },
      goal: (state, event) =>
        (event.type === 'tabOpened' && event.tab === 'grafauxna') ||
        (event.type === 'stepEntered' && state.ui.activeTab === 'grafauxna'),
    },
    {
      id: 'is-it-real',
      title: 'Is it real?',
      body: 'On billing’s dashboard, read the **Errors** chart. What does it say?',
      hints: [
        'Look at the right-hand end of Errors: where was it this morning, and where is it now?',
      ],
      thinking: 'Is it a blip that’s already gone, or a line that went up and stayed up?',
      options: [
        {
          id: 'real',
          label:
            'Errors jumped from about 0.1% to about 12% around 14:02, and stayed there. It’s real.',
        },
        { id: 'blip', label: 'A blip: errors went up for a moment and are already back down.' },
        { id: 'traffic', label: 'Errors are flat. The page fired because traffic went up.' },
      ],
      solution: { type: 'chooseOption', stepId: 'is-it-real', optionId: 'real' },
      goal: (_state, event) =>
        event.type === 'optionChosen' && event.stepId === 'is-it-real' && event.optionId === 'real',
      wrongAnswers: {
        blip: 'Kai: "Look at the right-hand end of Errors. It went up and stayed up. A blip comes back down on its own. This one hasn’t."',
        traffic:
          'Kai: "Read Errors itself, not Traffic. Errors are around 12%. That’s what the page is about."',
      },
      onEnter: [nudgeIsItReal.offer],
      reactions: [nudgeIsItReal.reaction],
    },
    {
      id: 'slo-burn',
      title: 'How bad? Check the budget',
      body: 'Real, yes. How bad? Open **SLOs** in Grafauxna and look at billing’s error budget and `burn rate`.',
      hints: ['SLOs is in Grafauxna’s own nav, next to Logs.'],
      thinking:
        'Is this “look at it Monday” bad or “drop everything” bad? The error budget will tell me how fast we’re spending it.',
      solution: { type: 'clickTarget', targetId: 'grafauxna-slos' },
      goal: (_state, event) =>
        event.type === 'targetClicked' && event.targetId === 'grafauxna-slos',
      afterNote:
        'The budget for the whole month is draining many times faster than on pace. At this speed it’s gone in hours, not weeks. That’s “drop everything.”',
      onComplete: [
        say(
          'taylor',
          'Support here 👋 Three customers in ten minutes say they can’t pay when they use a coupon. Anyone know what’s up? This is where they’re stuck: [inkwell.example/pricing](#/inkwell/pricing)',
          'taylor-coupons',
          'platform'
        ),
      ],
    },
    {
      id: 'reproduce',
      title: 'See it like a customer',
      body: 'Taylor says coupon checkouts fail. Open [inkwell.example/pricing](#/inkwell/pricing), apply the coupon **SAVE10**, and click **Pay**.',
      hints: [
        'Click “Have a code? Try SAVE10” to apply the coupon, then click Pay.',
        'The link in Taylor’s message in #platform opens the right page.',
      ],
      thinking:
        'Graphs are numbers. Customers are people. If I can break it myself, I understand it better, and I’ll know for sure when it’s fixed.',
      solution: { type: 'clickTarget', targetId: 'inkwell-pay' },
      goal: (_state, event) => event.type === 'targetClicked' && event.targetId === 'inkwell-pay',
      reactions: [
        {
          id: 'no-coupon',
          when: (_state, event) =>
            event.type === 'targetClicked' && event.targetId === 'inkwell-pay-plain',
          effects: [
            kai(
              'That one went through, and that’s a clue! Taylor said coupons. Try it with SAVE10.'
            ),
          ],
        },
      ],
      afterNote:
        '“Something went wrong.” That’s what customers see. Paying without a coupon still works, which is a clue: whatever broke is about coupons.',
    },
    {
      id: 'declare',
      title: 'Declare an incident',
      body: 'Customers are hurting and it isn’t going away. In **PagerDoody**, click **Declare incident**. That opens a channel just for this and brings in an `incident commander`.',
      hints: ['PagerDoody’s Incidents list has a Declare incident button.'],
      thinking:
        'Declaring feels dramatic. It isn’t. It just says “this needs more than one person” out loud. Morgan runs the show, so I can think.',
      solution: { type: 'clickTarget', targetId: 'page-declare' },
      goal: (_state, event) =>
        (event.type === 'targetClicked' && event.targetId === 'page-declare') ||
        (event.type === 'incidentRecorded' && event.entry.kind === 'declared'),
      onComplete: [
        { type: 'incident', command: { kind: 'declare', severity: 'SEV2', service: 'billing' } },
        {
          type: 'incident',
          command: { kind: 'postStatus', stage: 'investigating', optionId: 'investigating-clear' },
        },
        {
          type: 'flackMessage',
          id: 'morgan-ops',
          channel: INC,
          from: 'morgan',
          text: '{{player.name}}, you’re on ops: hands on the keyboard. I’ll keep us on track, Taylor has customers. What do we know so far?',
          quickReplies: [
            {
              id: 'facts',
              text: 'Coupon checkouts fail since about 14:02. Errors around 12%, budget burning fast. Checkout without a coupon works.',
            },
          ],
        },
      ],
    },
    {
      id: 'take-ops',
      title: 'Tell Morgan what you know',
      body: 'In the new incident channel, answer Morgan with what you’ve seen so far.',
      hints: ['Morgan’s message in the incident channel has a reply button.'],
      thinking:
        'Say what I know, not what I guess. Facts in the channel become the timeline later.',
      solution: { type: 'flackReply', messageId: 'morgan-ops', replyId: 'facts' },
      goal: (_state, event) => event.type === 'flackReply' && event.messageId === 'morgan-ops',
      onComplete: [
        say(
          'morgan',
          'Good. The next question is always the same: **what changed?** Check each idea against evidence, and say the verdict in here.'
        ),
      ],
    },
    {
      id: 'h-traffic',
      title: 'Idea 1: a rush of customers?',
      body: 'Maybe a rush of customers is swamping billing. Check **Traffic** on billing’s dashboard in Grafauxna.',
      hints: ['Traffic is the second chart on the dashboard.'],
      thinking:
        'Four suspects: a rush, a dead box, the payment provider, a deploy. I’ll check the quick ones fast and write each verdict down.',
      options: [
        { id: 'ruled-out', label: 'Ruled out: traffic is flat. No rush.' },
        { id: 'confirmed', label: 'Confirmed: traffic doubled at 14:02.' },
      ],
      solution: { type: 'chooseOption', stepId: 'h-traffic', optionId: 'ruled-out' },
      goal: (_state, event) =>
        event.type === 'optionChosen' &&
        event.stepId === 'h-traffic' &&
        event.optionId === 'ruled-out',
      wrongAnswers: {
        confirmed:
          'Kai: "Look again at Traffic: the same gentle line as this morning. Errors moved. Customers didn’t suddenly show up."',
      },
      onComplete: hypothesis(
        'A rush of customers?',
        'Ruled out: traffic on billing is flat in Grafauxna.'
      ),
    },
    {
      id: 'h-box',
      title: 'Idea 2: a box died?',
      body: 'Maybe a box turned off and took billing’s copies with it. Check **Boxes** in Argh CD.',
      hints: ['Argh CD has a Boxes view next to Applications.'],
      thinking:
        'If a box died, its copies would have moved, and Argh CD would show it. One click to check.',
      options: [
        {
          id: 'ruled-out',
          label: 'Ruled out: all four boxes are on and every billing copy is running.',
        },
        { id: 'confirmed', label: 'Confirmed: billing has no copies running.' },
      ],
      solution: { type: 'chooseOption', stepId: 'h-box', optionId: 'ruled-out' },
      goal: (_state, event) =>
        event.type === 'optionChosen' && event.stepId === 'h-box' && event.optionId === 'ruled-out',
      wrongAnswers: {
        confirmed:
          'Kai: "Look at Boxes again: four boxes on, and billing has its copies, all running. The boxes are fine. Something inside billing isn’t."',
      },
      onComplete: hypothesis(
        'A box died?',
        'Ruled out: all boxes on, billing copies running in Argh CD.'
      ),
    },
    {
      id: 'h-provider',
      title: 'Idea 3: the payment provider?',
      body: 'Maybe the company that processes card payments is down. What did your own checkout on inkwell.example tell you?',
      hints: ['Paying without a coupon worked. Would it, if the payment provider were down?'],
      thinking:
        'Blaming someone else’s system is tempting. It’s also usually wrong. What did my own test say?',
      options: [
        {
          id: 'ruled-out',
          label: 'Ruled out: checkout without a coupon still goes through, so payments work.',
        },
        { id: 'confirmed', label: 'Confirmed: nobody can pay at all.' },
      ],
      solution: { type: 'chooseOption', stepId: 'h-provider', optionId: 'ruled-out' },
      goal: (_state, event) =>
        event.type === 'optionChosen' &&
        event.stepId === 'h-provider' &&
        event.optionId === 'ruled-out',
      wrongAnswers: {
        confirmed:
          'Kai: "Try it: pay without a coupon on inkwell.example. It works. If the provider were down, every payment would fail, not just coupon ones."',
      },
      onComplete: hypothesis(
        'The payment provider?',
        'Ruled out: checkout without a coupon works on inkwell.example.'
      ),
    },
    {
      id: 'h-deploy',
      title: 'Idea 4: a deploy?',
      body: 'Open billing in **Argh CD** and read **History & Rollback**. Then find the deploy marker on billing’s dashboard in Grafauxna. What do you see?',
      hints: [
        'Argh CD → Applications → billing. History lists each version and when it went out.',
        'Grafauxna’s dashboard lists recent deploys under the charts.',
      ],
      thinking:
        'Most outages start with a change. If something changed at 14:01 and errors started at 14:02, that isn’t a coincidence until proven otherwise.',
      options: [
        {
          id: 'confirmed',
          label: `Confirmed: billing went from ${GOOD} to ${BAD} (Alex’s coupon change) at 14:01, one minute before errors jumped.`,
        },
        { id: 'ruled-out', label: 'Ruled out: nothing has deployed today.' },
      ],
      solution: { type: 'chooseOption', stepId: 'h-deploy', optionId: 'confirmed' },
      goal: (_state, event) =>
        event.type === 'optionChosen' &&
        event.stepId === 'h-deploy' &&
        event.optionId === 'confirmed',
      wrongAnswers: {
        'ruled-out': `Kai: "Check billing’s History in Argh CD again. ${BAD} went out a couple of minutes ago. Alex even announced it in #platform."`,
      },
      onEnter: [nudgeDeploy.offer],
      reactions: [nudgeDeploy.reaction],
      onComplete: [
        ...hypothesis(
          'A deploy?',
          `Confirmed: billing ${GOOD} → ${BAD} at 14:01, one minute before errors (Argh CD history and the deploy marker).`
        ),
        say('alex', 'Oh no. That’s my coupon change. I’m so sorry. What can I do?'),
        say(
          'morgan',
          'No blame here, Alex. Changes break things, that’s why we have this process. Stick around in case we need you. {{player.name}}: how do we stop the bleeding?'
        ),
      ],
    },
    {
      id: 'stop-bleeding',
      title: 'Stop the bleeding',
      body: 'You know what changed. What do you do *right now*? Watch the counter as you decide.',
      hints: [
        'The fastest way back to a version that worked, not the fastest way to understand the bug.',
      ],
      thinking:
        'Don’t fix it. Stop it. The fix can wait until customers can pay again. What’s the fastest way back to something that worked?',
      options: [
        { id: 'debug', label: 'Debug the coupon code live and ship a fix.' },
        { id: 'scale', label: 'Give billing more room: 10 copies instead of 2.' },
        {
          id: 'rollback',
          label: `Undo the deploy: put billing back on ${GOOD}, the last version that worked.`,
        },
        { id: 'argh', label: 'Click Rollback in Argh CD’s History.' },
        { id: 'wait', label: 'Wait ten minutes and see if it settles.' },
      ],
      solution: { type: 'chooseOption', stepId: 'stop-bleeding', optionId: 'rollback' },
      goal: (_state, event) =>
        event.type === 'optionChosen' &&
        event.stepId === 'stop-bleeding' &&
        event.optionId === 'rollback',
      wrongAnswers: {
        debug:
          'Kai: "Finding the bug could take an hour, and customers fail the whole time. Stop the bleeding first, then find the cause. Every tick of that counter is a person."',
        scale:
          'Kai: "Ten copies of a broken version is ten broken copies. Nothing was overloaded: traffic was flat. The code is wrong. Look, the counter kept climbing."',
        argh: `Kai: "Close! Argh CD would roll it back, but GitNub still says ${BAD}, and Argh CD makes the cluster match GitNub. A minute later it puts ${BAD} right back. Undo it where the truth lives: revert Alex’s change in GitNub."`,
        wait: 'Kai: "It didn’t settle. Bugs don’t get bored and leave. Ten minutes went by and the counter kept going."',
      },
      onEnter: [nudgeBleeding.offer],
      reactions: [
        nudgeBleeding.reaction,
        costly('debug', 8, 'Looked for the bug in the coupon code while it was live.'),
        costly('scale', 3, 'Considered giving billing 10 copies.'),
        costly('argh', 2, 'Rolled billing back in Argh CD; Argh CD put it back to match GitNub.'),
        costly('wait', 10, 'Waited ten minutes to see if it settled.'),
        ARGH_BOUNCE,
      ],
      onComplete: [
        {
          type: 'incident',
          command: { kind: 'mitigation', text: `Undo the deploy: put billing back on ${GOOD}.` },
        },
        say(
          'morgan',
          `Do it. Use the emergency revert on [Alex’s pull request](${ALEX_PR_LINK}): one click, no review wait.`
        ),
      ],
    },
    {
      id: 'revert',
      title: 'Revert it in GitNub',
      body: `Open [Alex’s pull request](${ALEX_PR_LINK}) in GitNub and click **Revert**. That’s the emergency path: GitNub goes back to ${GOOD} straight away, no review wait.`,
      hints: ['The Revert button is in the merge box at the bottom of the merged pull request.'],
      thinking:
        'One click. My hand is weirdly sweaty. It’s fine: a revert is just the old version, which ran fine all week.',
      solution: { type: 'revertPR', prId: 'latest' },
      goal: (_state, event) => event.type === 'prReverted',
      onEnter: [nudgeRevert.offer],
      reactions: [nudgeRevert.reaction, ARGH_BOUNCE],
      onComplete: [
        {
          type: 'incident',
          command: { kind: 'postStatus', stage: 'identified', optionId: 'identified-clear' },
        },
      ],
      afterNote: `GitNub says ${GOOD} again. Taylor posted to the status page that we found the cause.`,
    },
    {
      id: 'sync',
      title: 'Sync, and watch the copies swap',
      body: `Argh CD will notice GitNub changed within a few seconds. Or open billing in **Argh CD** and click **Sync** to go now. Then watch the copies swap back to ${GOOD}, one at a time.`,
      hints: ['Argh CD → Applications → billing. The Sync button is above History.'],
      thinking: 'Watching copies swap is the most boring, most wonderful thing I’ve ever seen.',
      solution: { type: 'sync', app: 'billing' },
      goal: (state, event) =>
        (event.type === 'appSynced' && event.app === 'billing') ||
        (event.type === 'gitOpsEvent' &&
          event.event.kind === 'AutoSync' &&
          event.event.appId === 'billing' &&
          billingFixed(state)),
      reactions: [ARGH_BOUNCE],
      afterNote: `Each ${BAD} copy stops only once a ${GOOD} copy is running in its place, so billing never drops to zero.`,
    },
    {
      id: 'verify-checkout',
      title: 'Try checkout again',
      body: 'The dashboard is one opinion. Be the customer again: on [inkwell.example/pricing](#/inkwell/pricing), apply **SAVE10** and click **Pay**.',
      hints: ['Same as before: apply SAVE10, then Pay.'],
      thinking: 'The graph says better. I want to see it the way a customer does.',
      solution: { type: 'clickTarget', targetId: 'inkwell-pay' },
      goal: (state, event) =>
        event.type === 'targetClicked' && event.targetId === 'inkwell-pay' && billingFixed(state),
    },
    {
      id: 'verify-signals',
      title: 'Is it really fixed?',
      body: 'Check billing’s **Errors** on the dashboard and the **burn rate** on SLOs, alongside your own checkout. Is it fixed?',
      hints: ['Three sources: the Errors chart, the SLO burn rate, and your own checkout.'],
      thinking: 'Three sources agreeing beats one source shouting.',
      options: [
        {
          id: 'fixed',
          label:
            'Errors are back near 0.1%, the burn rate dropped, and a coupon checkout went through. It’s fixed.',
        },
        { id: 'running', label: `Argh CD shows ${GOOD} running, so it’s fixed.` },
        { id: 'dipped', label: 'Errors dropped a little. Good enough, let’s close it.' },
      ],
      solution: { type: 'chooseOption', stepId: 'verify-signals', optionId: 'fixed' },
      goal: (_state, event) =>
        event.type === 'optionChosen' &&
        event.stepId === 'verify-signals' &&
        event.optionId === 'fixed',
      wrongAnswers: {
        running:
          'Kai: "Running isn’t the same as working. Argh CD tells you what’s running. The dashboard and a real checkout tell you whether customers are OK."',
        dipped:
          'Kai: "“A little” isn’t back to normal. Check errors are back where they were this morning and the burn rate has dropped."',
      },
      onComplete: [
        {
          type: 'incident',
          command: {
            kind: 'recovered',
            text: 'Recovered: checkout errors back to normal, and a coupon checkout works on inkwell.example.',
          },
        },
        say(
          'morgan',
          'Nice work. Customers can pay again. We’re not done until they know it, though.'
        ),
      ],
    },
    {
      id: 'post-update',
      title: 'Tell customers',
      body: 'In the incident channel, the **Status page update** box is on **Monitoring**. Pick the update a customer would want to read, and post it.',
      hints: [
        'Customers want to know: is it working, and is anyone still watching?',
        'The update that says it works now, and that we’re watching to make sure.',
      ],
      thinking:
        'Customers don’t care about version numbers. They care: is it my problem, is it fixed, what do I do now?',
      solution: { type: 'clickTarget', targetId: 'status-option:monitoring-clear' },
      goal: posted('monitoring-clear'),
      onEnter: [
        { type: 'openTab', tab: 'flack' },
        { type: 'openChannel', channel: INC },
      ],
      reactions: [
        weakUpdate('monitoring', 'monitoring-early'),
        weakUpdate('monitoring', 'monitoring-silent'),
      ],
      onComplete: [
        {
          type: 'incident',
          command: { kind: 'postStatus', stage: 'monitoring', optionId: 'monitoring-clear' },
        },
      ],
    },
    {
      id: 'all-clear',
      title: 'Post the all-clear',
      body: 'Fifteen quiet minutes later. Post the **Resolved** update: the all-clear.',
      hints: ['The update that says it’s done, what customers can do now, and what comes next.'],
      thinking:
        'Calling it too early is worse than calling it late. Fifteen boring minutes is the evidence.',
      solution: { type: 'clickTarget', targetId: 'status-option:resolved-clear' },
      goal: posted('resolved-clear'),
      onEnter: [
        { type: 'passTime', ms: 15 * MINUTE },
        say(
          'morgan',
          'Fifteen quiet minutes. Errors flat, no new tickets from Taylor. Post the all-clear.'
        ),
      ],
      reactions: [
        weakUpdate('resolved', 'resolved-terse'),
        weakUpdate('resolved', 'resolved-excuse'),
      ],
      onComplete: [
        {
          type: 'incident',
          command: { kind: 'postStatus', stage: 'resolved', optionId: 'resolved-clear' },
        },
      ],
    },
    {
      id: 'resolve',
      title: 'Resolve the incident',
      body: 'Back in **PagerDoody**, click **Resolve**. Then read your scorecard.',
      hints: ['Resolve is next to the incident in PagerDoody’s Incidents list.'],
      thinking:
        'Resolving means “customers are fine and we’re done firefighting.” Not “we understand everything.” That’s Monday’s job.',
      solution: { type: 'clickTarget', targetId: 'page-resolve' },
      goal: (_state, event) =>
        (event.type === 'targetClicked' && event.targetId === 'page-resolve') ||
        (event.type === 'incidentRecorded' && event.entry.kind === 'resolved'),
      onComplete: [
        { type: 'incident', command: { kind: 'resolve' } },
        say(
          'morgan',
          'Resolved. Thank you, everyone. Monday we write it up, blamelessly: what happened, not who.'
        ),
        kai(
          'Your first page, done. Look at the scorecard: no grades, just what moved each number.'
        ),
      ],
      afterNote:
        'Every step you took went on the incident’s timeline as you took it. Next chapter, that timeline becomes the write-up.',
    },
  ],
  mentorQuestions: ['rollback-vs-fix-forward', 'slo-vs-sla'],
  summary: [
    'Acknowledge first, then check it’s real, then how bad.',
    'Declare early. A commander runs the show so ops can think.',
    'Ask “what changed?” and rule ideas in or out with evidence.',
    'Stop the bleeding before finding the cause. Undo the deploy in GitNub, where the truth lives.',
    'Verify like a customer, tell customers plainly, and only then resolve.',
  ],
}
