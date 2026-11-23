import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { NINES_HALF_YEAR } from '@sra/engine/decision/scenarios'
import type { StorageLike } from '../../progress/store'
import { loadSimulationRuns } from './history'
import { NinesGame } from './NinesGame'

function memoryStorage(): StorageLike {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  }
}

describe('the nines game', () => {
  it('lets the learner promise 100% after Kai’s warning, and shows what it cost', async () => {
    const user = userEvent.setup()
    const storage = memoryStorage()
    render(<NinesGame scenario={NINES_HALF_YEAR} storage={storage} onKeep={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Promise 100%' }))
    expect(screen.getByText(/A 100% promise leaves no error budget/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Promise 100% anyway' }))

    // Shipping is frozen, with Kai's reason.
    const ship = screen.getByRole('button', { name: 'Ship the next feature' })
    expect(ship).toBeDisabled()
    expect(ship).toHaveAccessibleDescription(/Shipping is frozen/)

    for (let month = 1; month < 6; month++) {
      await user.click(screen.getByRole('button', { name: 'Keep going' }))
    }

    expect(screen.getByText(/Promised 100%\. Delivered 99\.99\d\d%/)).toBeInTheDocument()
    const ledger = screen.getByRole('table', { name: 'What each nine cost and saved' })
    const promise = within(ledger).getByRole('row', { name: /^100%/ })
    expect(promise).toHaveTextContent('Cost more than it returned')
    expect(loadSimulationRuns(storage)).toHaveLength(1)
  })

  it('compares a run with the learner’s earlier ones, and only those', async () => {
    const user = userEvent.setup()
    const storage = memoryStorage()
    render(<NinesGame scenario={NINES_HALF_YEAR} storage={storage} onKeep={vi.fn()} />)

    for (let month = 0; month < 6; month++) {
      await user.click(screen.getByRole('button', { name: 'Ship the next feature' }))
    }
    await user.click(screen.getByRole('button', { name: 'Play again with the same luck' }))
    await user.click(screen.getByRole('button', { name: 'Buy the next nine' }))
    await user.click(screen.getByRole('button', { name: 'Keep going' }))
    for (let month = 2; month < 6; month++) {
      await user.click(screen.getByRole('button', { name: 'Ship the next feature' }))
    }

    const runs = screen.getByRole('table', { name: 'Your runs of this game' })
    const rows = within(runs).getAllByRole('row').slice(1)
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/^199\.9%6/),
      expect.stringMatching(/^This run99\.99%4/),
    ])
  })

  it('takes an SLO but not 100%', async () => {
    const user = userEvent.setup()
    const onKeep = vi.fn()
    render(<NinesGame scenario={NINES_HALF_YEAR} storage={undefined} onKeep={onKeep} />)
    for (let month = 0; month < 6; month++) {
      await user.click(screen.getByRole('button', { name: 'Ship the next feature' }))
    }
    await user.click(screen.getByRole('button', { name: '100%' }))
    expect(onKeep).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: '99.99%' }))
    expect(onKeep).toHaveBeenCalledWith(0.9999)
  })
})
