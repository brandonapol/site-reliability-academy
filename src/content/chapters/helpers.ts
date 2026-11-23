import { createCluster } from '@sra/engine/cluster'
import type { GameState } from '@sra/engine/game'
import { createGitOps } from '@sra/engine/gitops'
import type { Effect, Reaction } from '@sra/engine/story/types'
import { STARTING_CLUSTER_SPEC, STARTING_GITOPS_SPEC } from '../world'

/** The production cluster and deploy repo as the learner finds them on day one. */
export function startingWorld(state: GameState): GameState {
  return {
    ...state,
    cluster: createCluster(STARTING_CLUSTER_SPEC),
    gitops: createGitOps(STARTING_GITOPS_SPEC),
  }
}

export const M1_TABS = ['flack', 'inkwell', 'arghcd'] as const
export const GITOPS_TABS = ['flack', 'inkwell', 'arghcd', 'gitnub'] as const

/**
 * Kai's "want a nudge?" in the Kai DM (the incident chapters' safety net): `offer` goes in a
 * step's `onEnter`, `reaction` in its `reactions`. Saying yes posts the nudge and opens the
 * step's first hint.
 */
export function kaiNudge(stepId: string, nudge: string): { offer: Effect; reaction: Reaction } {
  const messageId = `kai-nudge-${stepId}`
  return {
    offer: {
      type: 'flackMessage',
      id: messageId,
      channel: 'dm-kai',
      from: 'kai',
      text: 'Want a nudge?',
      quickReplies: [{ id: 'yes', text: 'Yes please' }],
    },
    reaction: {
      id: 'nudge',
      when: (_state, event) => event.type === 'flackReply' && event.messageId === messageId,
      effects: [
        { type: 'flackMessage', channel: 'dm-kai', from: 'kai', text: nudge },
        { type: 'showHint' },
      ],
    },
  }
}
