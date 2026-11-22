import {
  emptyProgress,
  parseProgress,
  PROGRESS_KEY,
  serializeProgress,
  type Progress,
} from './progress'

/** The subset of Web Storage used here, so tests can pass a fake. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface ProgressStore {
  get(): Progress
  /** Applies an update and saves it. Saving can fail (quota, privacy mode); progress then lives
   * in memory for this visit and the store reports it through `saveFailed`. */
  update(change: (progress: Progress) => Progress): void
  replace(progress: Progress): void
  clear(): void
  subscribe(listener: () => void): () => void
  /** True when the save found on load was unreadable and was set aside. */
  readonly discardedOnLoad: boolean
  readonly saveFailed: boolean
}

export function createProgressStore(storage: StorageLike | undefined): ProgressStore {
  let discardedOnLoad = false
  let saveFailed = false
  let progress = load()
  const listeners = new Set<() => void>()

  function load(): Progress {
    let raw: string | null
    try {
      raw = storage?.getItem(PROGRESS_KEY) ?? null
    } catch {
      return emptyProgress()
    }
    if (!raw) return emptyProgress()
    const parsed = parseProgress(raw)
    if (parsed) return parsed
    discardedOnLoad = true
    try {
      // Keep the unreadable save next to the new one rather than destroying it.
      storage?.setItem(`${PROGRESS_KEY}:discarded`, raw)
    } catch {
      // Nothing more to do.
    }
    return emptyProgress()
  }

  function save() {
    try {
      storage?.setItem(PROGRESS_KEY, serializeProgress(progress))
      saveFailed = false
    } catch {
      saveFailed = true
    }
  }

  function set(next: Progress) {
    if (next === progress) return
    progress = next
    save()
    for (const listener of listeners) listener()
  }

  return {
    get: () => progress,
    update: (change) => set(change(progress)),
    replace: (next) => set(next),
    clear: () => set(emptyProgress()),
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    get discardedOnLoad() {
      return discardedOnLoad
    },
    get saveFailed() {
      return saveFailed
    },
  }
}

/** `window.localStorage`, or undefined when touching it throws (privacy mode and so on). */
export function browserStorage(): StorageLike | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}
