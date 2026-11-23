import { act, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createGameConfig } from '../../content'
import { currentStep } from '@sra/engine/story/runner'
import { createGameStore, type StorageLike } from '../../store'
import {
  findShowMeTarget,
  routeForShowMeTarget,
  tabForShowMeTarget,
  targetIdFor,
} from '../instructions/showMe'
import { App } from './App'

const noStorage: StorageLike = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
}

/** Follows the first in-app link (`#/...`) in a step's text, the way a learner reading it would. */
function linkIn(text: string): string | undefined {
  return /\]\((#\/[^)]+)\)/.exec(text)?.[1]
}

describe('Ch 9 in the real app (#32)', () => {
  it('every step’s Show me target is on screen once the learner is where the step sends them', async () => {
    window.location.hash = ''
    const config = createGameConfig()
    const store = createGameStore({ config, storage: noStorage, search: '?chapter=09' })
    act(() => store.getState().pause())
    render(<App store={store} />)

    const visited: string[] = []
    for (let guard = 0; guard < 40; guard++) {
      const game = store.getState().game
      const step = currentStep(config, game)
      if (!step) break
      const solution = step.solution!
      const targetId = targetIdFor(solution, game)
      expect(targetId, step.id).toBeDefined()

      // Do what Show me does: switch tab, or go to the sub-view that renders the target. Targets
      // with no owning tab live on a page the step's text links to.
      const route = routeForShowMeTarget(targetId!, game)
      const tab = tabForShowMeTarget(targetId!)
      const link = linkIn(step.body)
      await act(async () => {
        if (!findShowMeTarget(targetId!)) {
          if (route) window.location.hash = `#${route}`
          else if (link && !targetId!.startsWith('option:')) window.location.hash = link
          else if (tab) store.getState().dispatch({ type: 'openTab', tab })
        }
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
      expect(findShowMeTarget(targetId!), `${step.id} → ${targetId}`).toBeDefined()

      visited.push(step.id)
      act(() => store.getState().dispatch(solution))
      // Delayed effects (none in Ch 9) would be scheduled; the clock is paused.
    }
    expect(store.getState().game.story.phase).toBe('complete')
    expect(visited).toHaveLength(20)
  }, 30_000)
})
