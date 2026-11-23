import { defineConfig, devices } from '@playwright/test'

const PORT = 4173

// Runs against the production build under the same /site-reliability-academy/ base path GitHub Pages uses.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // One retry on CI shows whether a failure is flaky, but a test that only passes on its retry
  // still fails the run: a flaky test is a bug, in the test or in the app.
  retries: process.env.CI ? 1 : 0,
  failOnFlakyTests: Boolean(process.env.CI),
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/site-reliability-academy/`,
    trace: 'retain-on-failure',
    permissions: ['clipboard-read', 'clipboard-write'],
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/site-reliability-academy/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
