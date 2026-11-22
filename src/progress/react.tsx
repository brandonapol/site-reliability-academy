import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react'

import type { Progress } from './progress'
import type { ProgressStore } from './store'

const ProgressContext = createContext<ProgressStore | undefined>(undefined)

export function ProgressProvider({
  store,
  children,
}: {
  store: ProgressStore
  children: ReactNode
}) {
  return <ProgressContext.Provider value={store}>{children}</ProgressContext.Provider>
}

export function useProgressStore(): ProgressStore {
  const store = useContext(ProgressContext)
  if (!store) throw new Error('useProgressStore needs a <ProgressProvider>')
  return store
}

/** The learner's progress, re-rendering whenever it changes. */
export function useProgress(): Progress {
  const store = useProgressStore()
  return useSyncExternalStore(store.subscribe, store.get)
}
