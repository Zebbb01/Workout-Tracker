/**
 * One sign-in system: Supabase Auth. Google goes through Supabase, and a
 * "try it" account can be saved with Google later without losing anything.
 */
import { test, expect } from '@playwright/test';
import { needsSupabase, startTrial } from './helpers';

test.skip(needsSupabase, 'needs a Supabase with anonymous sign-ins (CI starts one)');

test('Continue with Google hands over to Supabase Auth with Google as the provider', async ({ page }) => {
  await page.goto('/welcome');
  const authorize = page.waitForRequest((r) => r.url().includes('/auth/v1/authorize'));
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  const url = new URL((await authorize).url());
  expect(url.searchParams.get('provider')).toBe('google');
  expect(url.searchParams.get('redirect_to')).toContain('/auth/callback');
});

test('a try-it account is offered Save with Google, and signing out returns to welcome', async ({ page }) => {
  await startTrial(page);
  await page.getByRole('link', { name: 'More' }).click();
  await expect(page.getByText("You're trying Body Tracker without an account.")).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save my data with Google' })).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByText("signing out deletes what you've logged")).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/welcome$/);

  await page.goto('/');
  await expect(page).toHaveURL(/\/welcome$/);
});

test('units and targets are changed in More and used everywhere', async ({ page }) => {
  await startTrial(page);
  await page.getByRole('link', { name: 'More' }).click();
  await page.getByText('lb', { exact: true }).click();
  await page.getByLabel('Calories (kcal)').fill('2100');
  await page.getByRole('button', { name: 'Save targets' }).click();
  await expect(page.getByText('Daily targets saved')).toBeVisible();

  await page.getByRole('link', { name: 'Today' }).click();
  await expect(page.getByText('0 of 2,100 eaten')).toBeVisible();
  await expect(page.getByLabel("Today's weight (lb)")).toBeVisible();
});
