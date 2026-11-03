import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// `npm run test:live`: the same browser tests against the deployed site.
// They create "try it" accounts there, which the daily cleanup removes after 30 days.
export default defineConfig({
  ...base,
  retries: 1,
  workers: 2,
  use: { ...base.use, baseURL: process.env.LIVE_URL ?? 'https://body-tracker-iota.vercel.app' },
  webServer: undefined,
});
