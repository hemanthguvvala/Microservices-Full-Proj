import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E Testing Configuration
 * 
 * Used by: Microsoft, Google, Netflix, Stripe, Shopify, GitLab, VS Code
 * 
 * Why MNCs use Playwright over Cypress:
 * - Multi-browser testing (Chrome, Firefox, Safari, Mobile)
 * - Parallel execution across workers
 * - Built-in auto-waiting (no flaky tests)
 * - Network interception & mocking
 * - Trace viewer for debugging CI failures
 * - Visual comparisons for screenshot testing
 * - API testing alongside UI testing
 * - Made by Microsoft, used in VS Code itself
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,        // Fail if .only left in CI
  retries: process.env.CI ? 2 : 0,     // Retry on CI only
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['html'], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : 'html',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',            // Collect trace on first retry (CI debugging)
    screenshot: 'only-on-failure',       // Screenshot on failure
    video: 'retain-on-failure',          // Video on failure
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile browsers (critical for MNCs)
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Dev server to run before tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
