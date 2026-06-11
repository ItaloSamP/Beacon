import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 3 : undefined,
  reporter: [
    ['html'],
    ['list'],
  ],
  use: {
    baseURL: process.env.VITE_BACKEND_URL
      ? `http://localhost:${new URL(process.env.VITE_BACKEND_URL).port || 5173}`
      : 'http://localhost:5173',
    headless: true,
    browserName: 'chromium',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
});
