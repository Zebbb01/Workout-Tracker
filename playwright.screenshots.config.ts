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
  reporter: 'list',
});
