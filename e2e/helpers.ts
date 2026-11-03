import { expect, type Page } from '@playwright/test';

/**
 * Specs that sign in need a Supabase with anonymous sign-ins on. CI starts one
 * from supabase/migrations; locally, set E2E_SUPABASE=1 once the app's .env
 * points at a project where that is switched on.
 */
export const needsSupabase = !process.env.CI && !process.env.E2E_SUPABASE;

/** "Try it without an account", then either skip setup or stop on its first step. */
export async function startTrial(page: Page, { skipSetup = true } = {}) {
  await page.goto('/welcome');
  await page.getByRole('button', { name: 'Try it without an account' }).click();
  // A remote project can take a few seconds to create the account.
  await expect(page).toHaveURL(/\/onboarding$/, { timeout: 20_000 });
  if (skipSetup) {
    await page.getByRole('button', { name: 'Skip setup' }).click();
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible({ timeout: 20_000 });
  }
}

/** Any real image works for the file picker: the AI route is mocked, so its pixels never matter. */
export const photo = 'public/icon-192.png';

export const estimate = { name: 'Chicken rice bowl', calories: 640, protein_g: 42, carbs_g: 78, fat_g: 14.5 };
