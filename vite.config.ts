import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Built (and previewed) for GitHub Pages at /site-reliability-academy/ by default; set BASE_PATH to host it
// anywhere else. The dev server stays at /.
export default defineConfig(({ command, isPreview }) => ({
  base:
    command === 'build' || isPreview
      ? (process.env.BASE_PATH ?? '/site-reliability-academy/')
      : '/',
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'engine',
          environment: 'node',
          include: ['packages/engine/**/*.test.ts', 'src/content/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
          include: ['src/{features,store}/**/*.test.{ts,tsx}'],
        },
      },
    ],
  },
}))
