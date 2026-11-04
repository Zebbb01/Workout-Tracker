import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// `npm run screenshots`: the README and portfolio images, from the real app.
export default defineConfig({
  ...base,
  testDir: 'screenshots',
  testMatch: 'capture.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  projects: undefined,
  use: {
    ...base.use,
    // Headless Chromium on Linux hints fonts fully and snaps every letter to a whole pixel,
    // which spaces some letters unevenly in screenshots. Browsers on phones place them exactly.
    launchOptions: { args: ['--font-render-hinting=none'] },
  },
  reporter: 'list',
});
