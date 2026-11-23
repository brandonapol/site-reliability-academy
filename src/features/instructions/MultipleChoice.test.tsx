import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { createGameStore, GameStoreProvider, type StorageLike } from '../../store'
import { toyConfig } from '@sra/engine/story/__fixtures__/toyChapter'
import { MultipleChoice } from './MultipleChoice'

const noStorage: StorageLike = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
}

const OPTIONS = [
  { id: 'ruled-out', label: 'Ruled out' },
  { id: 'confirmed', label: 'Confirmed' },
]

describe('MultipleChoice', () => {
  it('starts each step unchecked, even when the last step had the same option ids', async () => {
    const user = userEvent.setup()
    const store = createGameStore({ config: toyConfig(), storage: noStorage })
    const picks: string[] = []
    const dispatch = store.getState().dispatch
    store.setState({
      dispatch: (action) => {
        if (action.type === 'chooseOption') picks.push(`${action.stepId}:${action.optionId}`)
        dispatch(action)
      },
    })
    const view = (stepId: string) => (
      <GameStoreProvider store={store}>
        <MultipleChoice stepId={stepId} options={OPTIONS} interpolate={(text) => text} />
      </GameStoreProvider>
    )
    const { rerender } = render(view('h-traffic'))
    await user.click(screen.getByRole('radio', { name: 'Ruled out' }))

    rerender(view('h-box'))
    expect(screen.getByRole('radio', { name: 'Ruled out' })).not.toBeChecked()
    await user.click(screen.getByRole('radio', { name: 'Ruled out' }))
    expect(picks).toEqual(['h-traffic:ruled-out', 'h-box:ruled-out'])
  })
})
