import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// `npm run test:live`: the same browser tests against the deployed site.
// They create "try it" accounts there, which the daily cleanup removes after 30 days.
// The live site always allows "try it" sign-ins, so the specs that need one run here too,
// in any shell (PowerShell has no `E2E_SUPABASE=1 npm ...` syntax).
process.env.E2E_SUPABASE = '1';

export default defineConfig({
  ...base,
  retries: 1,
  workers: 2,
  use: { ...base.use, baseURL: process.env.LIVE_URL ?? 'https://body-tracker-iota.vercel.app' },
  webServer: undefined,
});
