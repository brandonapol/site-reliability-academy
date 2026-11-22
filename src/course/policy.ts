/**
 * The AI policy (#45, spec section 2, "AI policy: off by default, then on deliberately"). One
 * source of text, shown at the start of each track and again at Phase 4 and Phase 6. A norm,
 * explained; nothing detects or tracks it.
 */

export type PolicyNotice =
  'ai-policy' | 'ai-policy-reminder' | 'ai-policy-flip' | 'ai-policy-everyone'

export interface PolicyText {
  title: string
  paragraphs: string[]
}

const WHY =
  "Nobody can supervise an agent doing a job they can't do themselves. What this course builds is the habit of forming your own hypothesis and testing it, and you only get that by doing the work."

export const AI_POLICY: Record<PolicyNotice, PolicyText> = {
  'ai-policy': {
    title: 'Please do the exercises without AI assistants',
    paragraphs: [
      "For weeks 1–26, please don't use AI assistants to solve exercises, drills or write-ups.",
      WHY,
      "We can't check this and won't try. It's your laptop and your learning. In weeks 27–28 the policy flips: you build your own AI SRE agent and judge its answers against problems you've already solved by hand.",
    ],
  },
  'ai-policy-reminder': {
    title: 'A reminder before you take the pager',
    paragraphs: [
      'Phase 4 is drills and incidents. The same request applies: work them yourself, without an AI assistant.',
      WHY,
      "That's what lets you judge an agent's investigation in week 27, when you'll know the answers it should have found.",
    ],
  },
  'ai-policy-flip': {
    title: 'Weeks 27–28: AI on, deliberately',
    paragraphs: [
      'From week 27 you design your own AI SRE agent and test it against incidents you already understand. Judgment stays with you: you approve anything it changes, and you are accountable for what it concludes.',
    ],
  },
  'ai-policy-everyone': {
    title: 'A note on AI assistants',
    paragraphs: [
      'This track is about judgment: deciding what to measure, when to launch, what to say in an incident. Try making those calls yourself before asking an AI assistant. Module 9 looks at what AI is good and bad at in incident response.',
    ],
  },
}
