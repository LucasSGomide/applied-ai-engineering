import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:3001',
    ...devices['Desktop Chrome'],
    // headless: false
  },
  webServer: {
    command: 'node server.js',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
  },
})
