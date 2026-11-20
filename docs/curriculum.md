# Site Reliability Academy — curriculum

A syllabus for 28 weeks (about six and a half months) of self-paced SRE learning, in two tracks, plus how each part is delivered
(browser, local cluster, the learner's own cloud account). This is the organising document: it names modules, what each one
teaches, where it runs and what the learner produces. It does not contain the lessons themselves.

## 1. Who it's for and what they leave with

| Track | Audience | Length | Runs in |
| --- | --- | --- | --- |
| **Practitioner** | New grads, and engineers who haven't done SRE | 28 weeks at 6–8 h/week | Browser, then a local cluster, then the learner's own cloud account |
| **Reliability for Everyone** | Product owners, managers, support, sales, business | 8 modules at 1–2 h each | Browser only; nothing is ever typed |

The two tracks share the same fictional company (Inkwell), the same first four weeks, and the same
incidents seen from different seats. A product owner and an engineer who both finish should be able to sit
in the same SLO review and understand each other. That shared vocabulary is the point of the non-technical
track.

**The T shape.** The SRE book describes a good SRE as broad across the stack with depth in one or two
areas. The 28 weeks build the bar of the T: every learner touches every area at working depth. The stem is
left to electives (section 8) and to the learner's job. The syllabus should not pretend to make anyone deep
in that time.

**What a Practitioner graduate can do:**

1. Trace a request through an unfamiliar system and draw it.
2. Choose SLIs for a user journey, set an SLO, and write the error budget policy that goes with it.
3. Instrument a service and build a dashboard and burn-rate alerts that page only when users are hurting.
4. Take a page: triage, mitigate first, communicate, hand off, and explain the causal chain afterwards.
5. Write a blameless postmortem with action items someone will actually do.
6. Ship a change safely (canary, rollback) and automate a piece of toil.
7. Reason about capacity, overload and failure domains in a design review, with numbers.
8. Describe what healthy SRE culture looks like and spot when a team hasn't got it.

**What a Reliability for Everyone graduate can do:** explain an SLO and an error budget in their own words,
use a budget to make a launch-or-fix decision, play a useful non-engineering role in an incident, read a
postmortem, and know what to ask an SRE team for.

## 2. Design principles

These come mostly from chapter 28 of the SRE book ("Accelerating SREs to On-Call and Beyond") and from
what already works in feauxbernetes and sre-crashout.

- **Concrete and sequential, never trial by fire.** Each module has a "know before moving on" checklist.
- **Do the thing, then name the thing.** The learner watches a copy die and come back before the word
  "reconcile" appears. Feauxbernetes already works this way.
- **Meet systems the way on-call does.** From telemetry, cluster and repository, not from a description of
  the fault. This is sre-crashout's rule and it carries through every lab.
- **Mitigation without explanation isn't done.** A drill ends when the symptom is gone *and* the learner can
  explain the causal chain.
- **Every module produces an artifact.** An SLO document, a dashboard, a runbook edit, a postmortem. The
  artifacts add up to a portfolio (section 7).
- **Access is earned in tiers.** Read-only first, then mutating access, as in the book's "powerups".
- **Culture is in every phase, not a module at the end.** Each phase carries one culture thread (section 6).
- **The content is free, and cloud spend is capped.** The academy charges nothing and never takes payment.
  The only money a learner spends goes to a cloud provider, for the labs in weeks 20–28, and the course is
  designed so that total stays under $100 (section 3). This is said on the landing page, before sign-up.
- **One site.** Feauxbernetes is ingested as Phase 1, and its engine becomes the academy's browser engine.

### Lesson format: video first

Every lesson opens with a recording of about ten minutes of Brandon talking through the concept, and then
hands straight to the interactive part. The shape of a lesson is always the same:

1. **Watch** (about 10 minutes): the idea, why it matters, one real story.
2. **Do**: the game, simulation or lab.
3. **Check**: the "know before moving on" list.
4. **Keep**: the artifact, where the lesson has one.

One video per week of the Practitioner track and one per Reliability for Everyone module is 35 videos,
about six hours of footage (Phase 1 and module 1 share theirs). Start there; split a week into
two videos only where one clearly can't carry it.

What goes in the video and what doesn't:

- **In:** concepts, mental models, war stories, judgement. Things that stay true for years.
- **Out:** tool walkthroughs and anything showing the academy's own screens. Those change, and re-recording
  is expensive. Step-by-step instructions live in the lesson text, where they can be edited.

Each video is planned from a brief kept in the repository next to the lesson: the one thing the viewer
should be able to say afterwards, the opening hook (usually an incident), three or four beats, the diagrams
needed for each beat, and the line that hands off to the exercise. Briefs and diagrams can be drafted with
AI; the explanation is recorded by a person in OBS, because that is the part learners trust.

Delivery:

- Files live in S3 behind a CDN, never served from the bucket directly. A ten-minute 1080p video is on the
  order of 100–200 MB, so transfer cost and seek speed both matter.
- Lessons refer to videos through a manifest keyed by lesson ID. A lesson with no video yet shows the
  written brief instead, so content can ship before filming catches up and a video can be replaced
  without touching the lesson.
- Every video has captions and a transcript. Some learners will read instead, and it makes the videos
  searchable.
- Chapter markers match the beats of the brief, so a learner can come back to one idea.

### AI policy: off by default, then on deliberately

For weeks 1–26 the course asks learners **not** to use AI assistants to solve exercises, drills or
write-ups. The reason is stated to them plainly: nobody can supervise an agent doing a job they can't do
themselves, and the muscle the course builds is forming and testing your own hypotheses. This can't be
enforced on a learner's own laptop and the course shouldn't try. It is a norm, explained once and
repeated at the start of Phase 4.

In weeks 27–28 the policy flips. Learners design their own AI SRE agent and it is examined on a hard
incident (Phase 6). By then they have solved the same class of problem by hand, which is what lets them
judge whether the agent's answer is right.

## 3. Where things run

Three tiers. A module is tagged with the lowest tier that can teach it honestly.

| Tier | Tag | What it is | Cost to learner | Used for |
| --- | --- | --- | --- | --- |
| 0 | **Browser** | Static site with a simulated world, as in feauxbernetes | Free | All of Reliability for Everyone; Phase 1; concept and reasoning work in every later phase |
| 1 | **Local** | `kind` on the learner's laptop with tinyo11y and sre-crashout-style products | Free | Real tooling from week 7 onward: kubectl, Helm, PromQL, traces, drills |
| 2 | **Cloud** | A short-lived managed cluster in the learner's own cloud account | Under $100 across the course, paid to the provider | Releasing to a real production environment (week 20); things a laptop can't show; team drills |

### Tier 0: browser only

Reuse the feauxbernetes architecture as it is: a pure TypeScript engine (`cluster`, `gitops`, `ci`,
`telemetry`, `incident`, `story`) under one fake clock, with content as data and React on top. The engine
is already deterministic and testable without a DOM, which is what makes a large content library
maintainable.

More than the intro fits here. The engine's seeded telemetry can back all of these without a server:

- An SLO workbench: pick an SLI, set a target, replay a month, watch the budget.
- A burn-rate alert simulator: tune windows and thresholds against replayed incidents, count pages.
- A query playground over generated series and logs (a small PromQL/LogQL subset).
- A simulated shell and Git, as Flack does, for the Linux and Git weeks.
- Paper Wheel of Misfortune: branching incidents where the "cluster" is the simulation.
- NALSD calculators: back-of-envelope capacity sums with checked answers.

Progress is stored locally, with optional sign-in to sync.

### Tier 1: local cluster

`kind` plus tinyo11y plus scenario products, which is exactly what sre-crashout's `make drill/*` targets
already do. The academy needs two additions:

- **A learner CLI** (`sra`, say) wrapping setup, `lab start`, `lab verify` and `lab reset`, so a learner
  never reads a Makefile on day one.
- **Verification that reports back.** `drill.bash verify` already knows whether a symptom is live or
  cleared. The CLI posts that result to the site so the module unlocks. Treat it as honour-system: a local
  check can be faked, and that is fine for self-paced learning.

The facilitator answer keys must stay out of the learner's checkout (sre-crashout's `DRILLS_DIR` already
allows this). For solo learners the site plays facilitator: it triggers the fault, delivers the page, and
releases the hint ladder on a timer.

Minimum laptop: roughly 4 cores and 16 GB of RAM for the full stack. Worth measuring before publishing a
number. Anyone below it goes to Tier 2 or stays on the browser versions.

### Tier 2: the learner's own cloud account

The learner creates the account, holds the credentials and runs the provisioning themselves. The academy
never sees a token or a card, bills nobody and runs no cloud infrastructure for labs. That is simpler and
safer than the academy provisioning on a learner's behalf, and standing up a cluster with infrastructure
as code is itself something the course wants them to do.

- `sra cloud up` and `sra cloud down` wrap a small Terraform module: a managed Kubernetes cluster, a
  container registry and a load balancer. The token stays on the learner's machine.
- The first cloud lesson (week 20) starts with setting a billing alert and reading a bill. Cost is an SRE
  concern, and this is where it's taught.
- Every cloud lab ends with a teardown step that `sra` verifies. `sra cloud status` lists anything still
  running and what it costs per hour.
- Labs are written against plain Kubernetes plus a `LoadBalancer` service, so they are not tied to one
  provider. One provider gets a tested Terraform module and step-by-step instructions; others are
  supported as far as "any conformant cluster works".

#### Which provider

Recommendation: **DigitalOcean as the default, Google Cloud as the documented alternative.**

| Provider | For | Against |
| --- | --- | --- |
| **DigitalOcean** | Free Kubernetes control plane. Flat, published prices with few line items, so a bill is easy to predict and to explain to a beginner. Fast to learn. | The GitHub Student Pack credit appears to have ended in mid-2026, and the general sign-up credit could not be confirmed. Plan as if there is none. |
| **Google Cloud** | $300 credit for new accounts, valid 90 days. GKE is the closest thing to "real" Kubernetes at work. | The 90 days can't be paused, so sign up at week 20, not week 1 (weeks 20–28 fit inside it). Billing has many more moving parts. |
| **Azure** | Azure for Students gives $100 with no credit card, the only option for a learner without one. | Full-time university students only. The general trial credit lasts 30 days, too short for nine weeks. |
| **AWS** | Most common on job descriptions. Up to $200 in credits on a new account. | The EKS control plane costs $0.10 an hour on its own, and NAT gateways and idle addresses bill quietly. The easiest place for a beginner to get a surprise. |

The promise of "under $100" has to hold at list price with no credits, because credits change and many
learners won't qualify. DigitalOcean is the provider where that is easiest to guarantee. Free credit on
another provider is then a bonus a learner can choose, not something the budget depends on.

#### The budget

Reference cluster on DigitalOcean: three nodes of 2 vCPU and 4 GB plus one load balancer, roughly $84 a
month at the prices found, which is about 12 cents an hour.

| Use | Hours | Approx. cost |
| --- | --- | --- |
| Week 20, release engineering (required) | 15 | $2 |
| Weeks 22–23, load and chaos (optional cloud parts) | 15 | $2 |
| Week 28, capstone (optional on cloud) | 10 | $1 |
| Registry, storage, transfer | — | a few dollars |
| **Planned total** | **40** | **under $10** |
| Worst case: cluster left running for all nine weeks | — | about $175 |

So the honest statement for the landing page is: **expect to spend around $10, and you will stay under
$100 as long as you tear down after each lab.** The gap between $10 and $175 is entirely forgotten
clusters, which is why teardown is verified and the billing alert comes first.

To check before publishing any number: current node and load balancer prices from the provider's own
pricing page (the node and load balancer figures here came from third-party trackers), and whether three
4 GB nodes actually hold tinyo11y plus three products.

A learner who can't or won't pay anything can still graduate: week 20 has a local version on `kind` with
two namespaces standing in for staging and production. It teaches the rollout mechanics but not the real
load balancer, registry or bill.

## 4. Practitioner track: 28 weeks

Six phases. Each week lists the topic, where it runs, the main activity and the artifact. Placement checks
let a learner skip weeks in Phase 2 they already know.

### Phase 1 — First week at Inkwell (weeks 1–4, Browser)

Shared with Reliability for Everyone. Mostly feauxbernetes as it exists, with the reliability-economics
material added. Goal: the whole job in miniature, before any tooling.

| Wk | Topic | Activity | Artifact |
| --- | --- | --- | --- |
| 1 | What SRE is. Boxes that run stuff, and stuff that turns them back on. Declarative state. | Existing chapters: welcome, boxes, order form, self-heal | — |
| 2 | How a change reaches production: GitOps, CI, tests as a safety net | Existing chapters: GitOps, CI. Break a build, read the failure | — |
| 3 | Seeing inside. "Is it working?" is an agreed number. Nines, what each costs, error budgets | Existing: seeing inside, SLO. New: a nines-versus-cost game | First SLO, chosen from options |
| 4 | Alerts that wake a human only when users hurt. Your first page. | Existing: alerts, the incident, bonus traffic and database chapters | Incident scorecard |

Culture thread: **reliability is a feature, and 100% is the wrong target.**
Reading: SRE book ch. 1 (Introduction), ch. 3 (Embracing Risk).

### Phase 2 — Under the hood (weeks 5–8, Browser → Local)

The systems fundamentals that the rest assumes. Modelled on LinkedIn's School of SRE level 101, cut down
to what the later phases actually use.

| Wk | Topic | Runs in | Activity | Artifact |
| --- | --- | --- | --- | --- |
| 5 | Linux for on-call: processes, files, signals, resource limits, reading logs. Git beyond commit. | Browser | Simulated shell missions: find what's eating the disk, who's holding the port | — |
| 6 | Networking as a request sees it: DNS, TCP, TLS, HTTP, load balancing, timeouts | Browser | "Follow the packet": place the failure on the path from a set of symptoms | A request-path diagram |
| 7 | Containers and Kubernetes at working depth: pods, deployments, services, probes, requests and limits, config and secrets | Local | Install the lab. Deploy the storefront product. Break and fix probes and limits | Lab installed and verified |
| 8 | Reverse-engineer a service: trace one request end to end through an unfamiliar product | Local | The book's "reverse engineering a production service" exercise on the ledger product | A system diagram, presented |

Culture thread: **curiosity over procedure.** First principles and statistical thinking, not memorised
playbooks.
Reading: School of SRE (Linux, networking, containers); SRE book ch. 2 (Production Environment).

### Phase 3 — Measure (weeks 9–13, Browser + Local)

Observability and SLOs. This is the centre of the course.

The framing is observability, not monitoring, following the second edition. Monitoring checks for failures
someone predicted. Observability is being able to ask a question nobody planned for and get an answer from
the telemetry already there. Dashboards and alerts are taught as things built on top of that, not as the
starting point.

| Wk | Topic | Runs in | Activity | Artifact |
| --- | --- | --- | --- | --- |
| 9 | Observability versus monitoring. Traces, logs and metrics as views of the same events. Golden signals, RED, USE. Symptoms versus causes | Browser, Local | Question detective: ten questions about a running product that no existing dashboard answers, starting from traces | — |
| 10 | Instrumentation with OpenTelemetry: spans, attributes, context propagation. High-cardinality data and what it buys. PromQL, LogQL, TraceQL | Local | Add a missing span and attributes to a service, then use them to find which customers a slow request affects | An instrumentation PR |
| 11 | SLIs from user journeys. Request-based and window-based. Where to measure | Browser | The Art of SLOs workshop, adapted: journeys → SLIs → SLOs for a fictional product | SLI specifications |
| 12 | SLOs, error budgets, and the error budget policy. Negotiating one with product | Browser, Local | Implement the SLOs as recording rules. Role-play the policy negotiation with a simulated product owner | An SLO document and an error budget policy |
| 13 | Alerting on SLOs: multi-window, multi-burn-rate. Alert quality, pager load, dashboards people use | Browser, Local | Tune burn-rate alerts against a month of replayed incidents: catch everything real with the fewest pages | Alert rules and a service dashboard |

Culture thread: **data over opinion.** The error budget as the incentive that product and SRE share.
Reading: SRE book ch. 4, 6; Workbook ch. 2–5 and appendices A and B; *Observability Engineering*
(Majors, Fong-Jones, Miranda); *Implementing Service Level Objectives* (Hidalgo).

### Phase 4 — Respond (weeks 14–18, Local)

On-call, incidents and learning from them. The sre-crashout drill tiers set the difficulty curve.

| Wk | Topic | Runs in | Activity | Artifact |
| --- | --- | --- | --- | --- |
| 14 | Being on-call: the first five minutes, "what changed?", mitigate before diagnose, escalation, handoffs. Runbooks | Local | **Basic** drills on all three products. Shadow mode: the site narrates what an expert would check | A runbook improvement |
| 15 | Troubleshooting as a method: hypothesise, test, narrow. Following an error from the user to its cause | Local | **Easy** drills | Timeline of one drill |
| 16 | Incident management: severity, commander, scribe, communications lead. Writing status updates | Browser, Local | A multi-role incident played as commander, then as comms. Write three status updates under time pressure | Status updates; a handoff note |
| 17 | Postmortems and learning from incidents: blameless language, contributing factors over root cause, action items that get done | Browser | Postmortem reading club on real public write-ups. Then write one for a week 15 drill | A postmortem |
| 18 | When the obvious explanation is wrong: correlating signals, red herrings | Local | **Medium** drills, with reverse shadowing. Optional: a team Wheel of Misfortune on a shared cluster | Second postmortem |

Culture thread: **blamelessness and sustainable on-call.** No heroes; a cap on pages per shift; it is
always fine to escalate.
Reading: SRE book ch. 11–15, 28; Workbook ch. 8–10; PagerDuty's Incident Response guide; the Howie guide
to post-incident learning; Google's "Anatomy of an Incident" and "Why Heroism is Bad".

### Phase 5 — Change and prevent (weeks 19–23, Local + Cloud)

Most outages come from change. This phase is about making change safe and removing work that shouldn't be
done by hand. Release engineering gets two weeks: the mechanics locally, then a real release to a real
environment.

| Wk | Topic | Runs in | Activity | Artifact |
| --- | --- | --- | --- | --- |
| 19 | Release engineering I: build once and promote, versioning, config as a change like any other, progressive delivery, canaries, automated rollback | Local | Convert a product's Deployment to a Rollout. Ship a bad release through a canary and watch it get caught. Then ship one the canary can't catch, and work out why | A rollout config |
| 20 | Release engineering II: taking apps to production. Environments, registries, promotion, canary analysis driven by SLO metrics, traffic shifting at a real load balancer, rollback under real traffic | **Cloud** | Stand up a cluster in your own account. Deploy three apps to staging, then promote each to production with a canary rollout gated on the SLOs from week 12. One of the three releases is bad | A release pipeline, a release checklist, and a torn-down cluster |
| 21 | Toil: recognising it, measuring it, the 50% cap. Automation and its hazards. Infrastructure as code | Local | A week of simulated tickets, then automate the worst one | An automation PR and a toil log |
| 22 | Load and overload: capacity planning with cost in view, autoscaling, load shedding, retries, backoff, cascading failure | Local, Cloud optional | Load-test a product to its knee. Cause a retry storm, then fix it. On cloud: watch nodes autoscale and read what it cost | A capacity note |
| 23 | Testing for reliability: chaos experiments with a hypothesis, game days, disaster recovery, backups that restore | Local, Cloud optional | Design and run one chaos experiment. Restore a database from backup against the clock. On cloud: lose a whole node | An experiment report |

Week 20 is where the earlier phases meet: the cluster from Phase 2, the telemetry and SLOs from Phase 3,
and the rollback instinct from Phase 4 all get used in one release. Argo Rollouts is the natural tool,
since learners have watched its parody, Argh CD, since week 1.

Culture thread: **eliminate toil, prefer simplicity.** Hope is not a strategy.
Reading: SRE book ch. 5, 7, 8, 17, 21, 22, 26; Workbook ch. 6, 7, 11, 14–17; Principles of Chaos
Engineering.

### Phase 6 — Design, AI and graduation (weeks 24–28, Browser + Local)

| Wk | Topic | Runs in | Activity | Artifact |
| --- | --- | --- | --- | --- |
| 24 | Distributed systems for the working SRE: replication, consistency, consensus, failure domains, why stateful things are hard | Browser | Interactive failure models: partition a cluster and predict what happens | — |
| 25 | Non-abstract large system design: design it, then size it with real numbers | Browser | The SRE Classroom ImageServer or PubSub workshop with calculator-checked sums | A design document |
| 26 | The wider job: production readiness reviews, security as reliability, engagement models, team health | Browser, Local | Run a readiness review on the product released in week 20. Choose an engagement model for three teams | A readiness review |
| 27 | AI for SRE: what agents are good and bad at in an investigation, tool design, read-only by default, evaluating an agent against incidents you already understand | Local | **Build your own AI SRE agent** and test it on the medium drills from week 18 | An agent and its eval results |
| 28 | **Capstone**, in two parts | Local, Cloud optional | **A:** a hard drill as primary on-call, by hand. **B:** the learner's agent investigates a different, unseen cascading failure and is graded | The on-call final exam; the agent's scorecard; a review of the agent's investigation |

Culture thread: **how SRE fits an organisation, and judgement stays with people.** Engagement models,
saying no well, and being accountable for what your agent concludes.
Reading: Workbook ch. 12, 18–21; SRE book ch. 23, 32; *Building Secure and Reliable Systems*;
*Designing Data-Intensive Applications* (Kleppmann), selected chapters.

Graduation is the book's rite of passage: a completed on-call checklist and the final drill.

#### The agent module (weeks 27–28)

**What the learner builds.** An agent that takes a page and returns an investigation. The academy supplies
a starter harness so the week goes on design, not plumbing: the loop, a read-only Kubernetes service
account, and query access to traces, logs and metrics in tinyo11y. The learner decides what tools to
expose and how, what the agent is told about the system, how it plans, when it stops, and what it does
when it isn't sure. Any model can be used; learners bring their own API key or a local model.

**The contract.** The agent receives what a human on-call receives: the page text, cluster access, the
telemetry endpoints and the product's repository with its runbooks and changelog. It returns a structured
report: the causal chain, the evidence for each link, what it ruled out, a proposed mitigation, and its
confidence. Read-only is the default. An agent may propose a mitigation; applying one requires the learner
to approve it, and that approval is part of what is graded.

**Developing it (week 27).** The learner tests against the medium drills they solved by hand in week 18.
They know the answers, so they can see exactly where the agent goes wrong: chasing the red herring,
stopping at the first plausible cause, asserting things it never checked. Writing a few eval cases of
their own is part of the week.

**The exam (week 28, part B).** A held-out cascading failure in the learner's own cluster, of the kind
sre-crashout's hard tier already models: the symptom shows in one service, the cause sits two or three
hops away, the change that caused it looks reasonable, and there are several red herrings. Retry
amplification, saturation behind a quiet fallback, and a dependency that fails slowly rather than loudly
are the right families. The scenario lives in a new, separate repository, not in sre-crashout, whose drills and answer keys are
public. Its answer key must never reach the learner's machine in readable form.

**Grading.** Against the scenario's answer key, over three runs, because agents are not deterministic:

| Measure | What earns credit |
| --- | --- |
| Causal chain | Each link of the real chain identified, in order, not just the final cause |
| Evidence | Every claim backed by a query or observation the agent actually made |
| Red herrings | Named and ruled out with a reason, not ignored and not followed |
| Mitigation | Would clear the user-facing symptom; least drastic option that does |
| Safety | No mutating action without approval; nothing destructive proposed |
| Calibration | Stated confidence matches how right it was; says "I don't know" when it doesn't |
| Cost | Tool calls, tokens and wall-clock time, reported but weighted lightly |
| Consistency | How much the three runs agree |

Sre-crashout's `outage-drill` skill already has the pattern for this: a case, files, and one grader per
criterion. The agent exam is the same structure pointed at the learner's agent. Run locally, the score is
honour-system like every other lab.

**The last artifact** is the learner's own review of their agent's investigation, written like a
postmortem: where it was right, where it was confidently wrong, and what they would change. Part A exists
so they are able to write it.

## 5. Reliability for Everyone: 8 modules

Browser only. The feauxbernetes rule holds throughout: the learner never types code, YAML or a command.
Each module is one sitting.

| # | Module | The learner does | Leaves with |
| --- | --- | --- | --- |
| 1 | Your first week at Inkwell | Feauxbernetes, as it is | How software gets to customers and stays up |
| 2 | How reliable is reliable enough? | Runs a product for a simulated year, buying nines and seeing what they cost in money and features | Why 100% is the wrong target |
| 3 | Reliability from the customer's seat | Sorts user journeys by importance and picks what to measure for each | SLIs, in plain words |
| 4 | The budget | Sets an SLO, watches a quarter play out, spends and overspends the budget | Error budgets as a spending decision |
| 5 | Launch or fix? | Plays product owner across a quarter of trade-offs with a simulated SRE lead and a policy to honour | The error budget policy; why it removes the argument |
| 6 | In the incident room | Plays customer liaison and communications lead in the same incidents engineers debug in Phase 4 | Severity, roles, status updates that help |
| 7 | Afterwards | Reads a postmortem, rewrites blaming sentences, ranks action items against a roadmap | Blamelessness; why follow-through is a product decision |
| 8 | Working with SRE | Chooses an engagement model for three teams; reads an on-call health report; spots toil as cost | What to ask for and what to offer |

Capstone: an SLO and error budget policy, one page, for a product the learner actually works on.

Sources: The Art of SLOs (written to be run with mixed audiences), Google's "Product-Focused Reliability
for SRE", "Enterprise Roadmap to SRE", "SRE as a Team Sport", Workbook ch. 18.

Where the tracks meet: modules 5 and 6 are the other side of Practitioner weeks 12 and 16. A cohort or a
company running both can pair a product person with an engineer for those two sessions.

## 6. Culture threads

One per phase, taught by putting the learner in a situation where the culture decides the outcome, not by
a lecture.

| Phase | Thread | How it shows up |
| --- | --- | --- |
| 1 | Reliability is a feature; 100% is the wrong target | The nines game makes over-reliability visibly expensive |
| 2 | Curiosity over procedure | Exercises can't be solved from a checklist |
| 3 | Data over opinion; shared incentives | The policy negotiation has a right answer only if both sides use the budget |
| 4 | Blamelessness; sustainable on-call; no heroes | A colleague in the story makes the mistake. The solo-hero path through an incident scores worse than escalating |
| 5 | Eliminate toil; simplicity | The ticket week is deliberately tedious. The 50% cap is tracked on the learner's own time |
| 6 | SRE in the organisation; judgement stays with people | The readiness review ends in a negotiated "not yet". The agent's confident wrong answers are the learner's to catch |

## 7. Game design and assessment

- **One continuous story.** The learner's career at Inkwell: new hire, shadow, secondary, primary on-call,
  incident commander. Ranks follow the book's on-call ramp and gate access, read-only before mutating.
- **The error budget is the health bar.** It persists across a phase, so a careless week 19 rollout costs
  budget the learner wanted in week 22.
- **The runbook is the inventory.** The learner's own runbook grows from their notes and is what they carry
  into the final drill.
- **Postmortems are the collectibles.** Finishing a drill unlocks a related real-world public postmortem.
- **Page of the day.** A five-minute browser incident for spaced repetition between modules.
- **Compare a learner with their past self, not with others.** Record time to detect, to mitigate and to
  explain, and hints used, as sre-crashout does. A public speed leaderboard would reward exactly the
  heroics the course teaches against.
- **A pause button on every clock.** Pressure is useful; pressure you can't stop isn't teaching.

Assessment by tier: browser modules check state reached; labs check with a verify script; written
artifacts are scored by the learner against a rubric with a worked example, with peer or mentor review
where a cohort exists. The portfolio at the end holds an SLO document and policy, a dashboard and alert
rules, two postmortems, a runbook, an automation change, a design document, a readiness review, and the
AI SRE agent with its scorecard and review.

## 8. Electives: starting the stem of the T

After week 28. Each is four to six weeks and assumes the core.

Observability engineering · Kubernetes platform operation · Databases and stateful systems · Networking and
traffic · Release and platform engineering · Incident analysis and human factors · Security and reliability
· Reliability of AI and GPU workloads · AI agents for operations (taking the week 27 agent further)

## 9. Sources and licensing

| Source | Used for | Licence note |
| --- | --- | --- |
| *Site Reliability Engineering*, 1st ed. (free at sre.google) | Reading throughout; ch. 28 shapes the course structure | CC BY-NC-ND: link to it, don't reproduce or adapt it |
| *Site Reliability Engineering*, 2nd ed. (2026) | Theme alignment only, see below | Not free online; buy or link |
| *The Site Reliability Workbook* (free at sre.google) | Phases 3–6 | CC BY-NC-ND, as above |
| SRE Classroom: Art of SLOs, ImageServer, PubSub | Weeks 11 and 25; non-technical modules 3–5 | CC BY 4.0: may be adapted with credit to Google |
| *Building Secure and Reliable Systems* (free online) | Week 26 | Check before reuse |
| LinkedIn School of SRE | Shape of Phase 2 | Check before reuse |
| PagerDuty Incident Response and Howie guides | Phase 4 | Check before reuse |

The non-commercial, no-derivatives terms on the two Google books matter once the academy takes payment:
assign chapters as reading and write original lessons. The Classroom workshops are the material that can
be adapted directly.

**On the second edition.** Its table of contents could not be retrieved (the publisher's site refused the
request and the book is not readable online), so chapter numbers above refer to the first edition and the
Workbook. The syllabus follows the second edition's two main shifts, observability over monitoring
(Phase 3) and AI for SRE (weeks 27–28), and the other themes Google's announcement lists: burn-rate
alerting on user-centred SLOs (week 13), progressive delivery and declarative infrastructure (weeks 19–21),
continuous resilience testing (week 23), capacity with cost in view (week 22) and newer organisational
models (week 26). With a copy in hand, re-map the reading lists to its chapters.

## 10. Decisions

Settled:

- **One site.** Feauxbernetes is ingested as Phase 1.
- **Video first.** Every lesson opens with a ten-minute recording (section 2).
- **AI off by default**, then the agent module in weeks 27–28.
- **Free content, learner-paid cloud.** No payments to the academy. Cloud labs run in the learner's own
  account with a stated budget under $100.
- **28 weeks.** Release engineering has two weeks and the wider-job week is restored.
- **Human hard drill stays** in the capstone, before the agent exam.
- **The exam scenario gets its own repository**, kept private.

Open:

1. **Cloud provider.** Recommended: DigitalOcean as the tested default, Google Cloud documented as the
   alternative (section 3). Needs a price check against the providers' own pages before the landing page
   quotes a number.
2. **Cohorts or solo only?** Solo works for everything except the team Wheel of Misfortune. Cohorts make
   peer review and the paired sessions possible and are worth adding once content exists.
3. **Build order.** Recommended: ingest feauxbernetes, then Reliability for Everyone modules 2–5 (browser
   only, reuses the existing telemetry engine), then Phase 3, then Phase 4 on top of sre-crashout. Film
   each batch's videos once its interactive part is stable, so the video and the exercise agree.
4. **Does Reliability for Everyone get an AI module?** A short ninth module on what to expect from AI in
   incident response would fit, but it isn't in the plan yet.
