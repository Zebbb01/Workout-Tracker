import { defineConfig, devices } from '@playwright/test';

const port = 3100;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://localhost:${port}`, trace: 'retain-on-failure' },
  // Phone first: this is where people open it.
  projects: [{ name: 'phone', use: { ...devices['Pixel 7'] } }],
  webServer: {
    // CI builds in its own step; locally every run tests a fresh production build.
    command: process.env.CI ? `npm run start -- -p ${port}` : `npm run build && npm run start -- -p ${port}`,
    url: `http://localhost:${port}/offline.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
