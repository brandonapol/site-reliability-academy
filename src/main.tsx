import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { createGameConfig } from './content'
import { App } from './features/shell/App'
import './index.css'
import { lessonStart } from './play/lessonStart'
import { LessonBar } from './play/LessonBar'
import { browserStorage, createGameStore, GameStoreProvider, loadSave } from './store'

// The game page (play.html). Opened from a lesson as `play.html?lesson=<id>`; see #43.

const root = document.getElementById('root')

if (!root) {
  throw new Error('Missing #root element')
}

const saved = loadSave(browserStorage())
const start = lessonStart(
  window.location.search,
  saved.kind === 'loaded' ? saved.save.game.story.chapterId : undefined
)

const store = createGameStore({ config: createGameConfig(), search: start.search })
// A debounced save can lose its last ~500ms of progress on a tab close; flush it right away.
window.addEventListener('pagehide', () => store.getState().flushSave())

createRoot(root).render(
  <StrictMode>
    {start.lesson && (
      <GameStoreProvider store={store}>
        <LessonBar
          lesson={start.lesson}
          trackId={new URLSearchParams(window.location.search).get('track')}
        />
      </GameStoreProvider>
    )}
    <App store={store} />
  </StrictMode>
)
