/**
 * Gyms have bad reception. Logging keeps working offline, the app says where
 * the entries are, and they sync on their own once the connection is back.
 */
import { test, expect } from '@playwright/test';
import { needsSupabase, startTrial } from './helpers';

test.skip(needsSupabase, 'needs a Supabase with anonymous sign-ins (CI starts one)');

test('a set logged offline is saved on the phone and syncs when back online', async ({ page, context }) => {
  await startTrial(page);
  await page.getByRole('link', { name: 'Log a set' }).click();
  await expect(page.getByRole('heading', { name: 'Log' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Synced' })).toBeVisible();

  await context.setOffline(true);
  await expect(page.getByText('Offline. What you log stays on this phone and syncs later.')).toBeVisible();

  await page.getByRole('radio', { name: 'Deadlift' }).click();
  await page.getByRole('button', { name: 'Add set' }).click();
  await expect(page.getByText('Set saved: Deadlift')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Deadlift' })).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByText('Offline. What you log stays on this phone')).toBeHidden();
  await expect(page.getByRole('status').filter({ hasText: 'Synced' })).toBeVisible({ timeout: 15_000 });
});

test('pages already opened still open with no connection', async ({ page, context }) => {
  await startTrial(page);
  // The deployed site registers the worker itself; localhost never does (see RegisterServiceWorker).
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
  });
  for (const path of ['/', '/log', '/meals']) await page.goto(path);

  await context.setOffline(true);
  await page.goto('/log');
  await expect(page.getByRole('heading', { name: 'Log' })).toBeVisible();
  await expect(page.getByText('Offline. What you log stays on this phone')).toBeVisible();
  await context.setOffline(false);
});
