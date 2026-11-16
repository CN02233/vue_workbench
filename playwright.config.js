const { defineConfig, devices } = require('@playwright/test')

const PORT = 8082
const BACKEND = process.env.BUSINESS_API_URL || 'http://localhost:8081'

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  // Fixtures live in one shared database, so tests run one at a time.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      // Set PW_CHANNEL=chrome to drive an installed Chrome instead of the
      // downloaded build, which is handy when the download is slow.
      use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL || undefined }
    }
  ],
  webServer: {
    command: 'npm run serve',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 180_000,
    env: { BUSINESS_API_URL: BACKEND }
  }
})
