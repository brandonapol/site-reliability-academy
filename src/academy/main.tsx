import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '../index.css'
import { COURSE, gameLessonsOf } from '../course'
import { progressFromGameSave } from '../progress/fromGameSave'
import { browserStorage, createProgressStore } from '../progress/store'
import { loadSave } from '../store/persistence'
import './academy.css'
import { App } from './App'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

const storage = browserStorage()
const store = createProgressStore(storage)

// The game shares this origin, so its save says how far the learner has played, whether before the
// academy existed or on play.html since the last visit. Fold that into course progress (#15).
const game = loadSave(storage)
if (game.kind === 'loaded') {
  const current = store.get()
  const next = progressFromGameSave(
    current,
    game.save.game.story,
    gameLessonsOf(COURSE),
    new Date()
  )
  if (next !== current) store.replace(next)
}

createRoot(root).render(
  <StrictMode>
    <App store={store} />
  </StrictMode>
)
