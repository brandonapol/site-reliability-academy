import { resolve } from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Built (and previewed) for GitHub Pages at /site-reliability-academy/ by default; set BASE_PATH to
// host it anywhere else. The dev server stays at /.
//
// Two pages: index.html is the academy (landing, course map, lessons) and play.html is the
// feauxbernetes game, which keeps its own hash routes and save. See #43.
export default defineConfig(({ command, isPreview }) => ({
  base:
    command === 'build' || isPreview
      ? (process.env.BASE_PATH ?? '/site-reliability-academy/')
      : '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        academy: resolve(import.meta.dirname, 'index.html'),
        play: resolve(import.meta.dirname, 'play.html'),
      },
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'engine',
          environment: 'node',
          include: [
            'packages/engine/**/*.test.ts',
            'src/content/**/*.test.ts',
            'src/course/**/*.test.ts',
            'src/progress/**/*.test.ts',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
          include: ['src/{features,store,academy,play}/**/*.test.{ts,tsx}'],
        },
      },
    ],
  },
}))
