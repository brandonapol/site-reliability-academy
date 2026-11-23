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
    // `make test/coverage` (CI) fails below these. They sit just under today's numbers, so new
    // code has to bring its tests with it. Raise them as coverage grows; never lower them to
    // get a PR through.
    coverage: {
      provider: 'v8',
      include: ['src/**', 'packages/**'],
      exclude: ['**/*.test.*', '**/__fixtures__/**', 'src/test/**', '**/*.d.ts'],
      reporter: ['text-summary', 'html'],
      thresholds: { statements: 90, branches: 83, functions: 91, lines: 91 },
    },
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
