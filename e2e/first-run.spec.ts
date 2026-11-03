/**
 * The two-minute promise: a new person, on a phone, with no instructions,
 * tries the app, logs a set, a meal from a photo and today's weight, and sees
 * their progress.
 */
import { test, expect } from '@playwright/test';
import { estimate, needsSupabase, photo, startTrial } from './helpers';

test.skip(needsSupabase, 'needs a Supabase with anonymous sign-ins (CI starts one)');

test('a visitor signed out is sent to the welcome screen', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByRole('button', { name: 'Try it without an account' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
});

test('try it, set up, log a set, a meal from a photo and a weight, then see progress', async ({ page }) => {
  await page.route('**/api/nutrition', (route) => route.fulfill({ json: estimate }));
  await startTrial(page, { skipSetup: false });

  // Onboarding: three steps, sensible defaults, one typed number.
  await page.getByRole('radio', { name: /Lose fat/ }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Weight (kg)').fill('82');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByLabel('Calories (kcal)')).not.toHaveValue('');
  await page.getByRole('button', { name: 'Start tracking' }).click();

  // Today: the weight typed during setup is today's weigh-in.
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await expect(page.getByText('Logged today: 82 kg')).toBeVisible();
  await expect(page.getByText('No sets yet today')).toBeVisible();

  // A set in three taps: Log a set, an exercise, Add set.
  await page.getByRole('link', { name: 'Log a set' }).click();
  await page.getByRole('radio', { name: 'Bench press' }).click();
  await page.getByRole('button', { name: 'Add set' }).click();
  await expect(page.getByText('Set saved: Bench press, 20 kg × 8')).toBeVisible();
  // The next set starts as a copy of the last one: one more tap.
  await page.getByRole('button', { name: 'Add set' }).click();
  await expect(page.getByRole('list').filter({ hasText: '20 kg × 8' }).getByRole('listitem')).toHaveCount(2);

  // A meal from a photo: the AI fills the form, the person confirms.
  await page.getByRole('link', { name: 'Meals' }).click();
  await page.getByRole('button', { name: 'Add meal' }).click();
  const fileChooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Take a photo' }).click();
  await (await fileChooser).setFiles(photo);
  await expect(page.getByText('AI estimate. Check the numbers')).toBeVisible();
  await expect(page.getByLabel('Meal name')).toHaveValue(estimate.name);
  await expect(page.getByLabel('Calories (kcal)')).toHaveValue('640');
  // Nothing is saved until the person says so.
  await page.getByLabel('Calories (kcal)').fill('600');
  await page.getByRole('button', { name: 'Save meal' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: estimate.name })).toContainText('600 kcal');

  // Progress shows the weigh-in and the milestones reached.
  await page.getByRole('link', { name: 'Progress' }).click();
  await expect(page.getByRole('heading', { name: 'Weight' })).toBeVisible();
  await expect(page.getByText('One more weigh-in and your trend starts.')).toBeVisible();
  for (const name of ['First set logged', 'First meal logged', 'First weigh-in']) {
    await expect(page.getByRole('listitem').filter({ hasText: name })).toContainText('Reached');
  }

  // And Today adds it all up.
  await page.getByRole('link', { name: 'Today' }).click();
  await expect(page.getByText('2 sets today')).toBeVisible();
  await expect(page.getByText(/600 of [\d,]+ kcal eaten/)).toBeVisible();
});

test('repeat the last workout in two taps', async ({ page }) => {
  await startTrial(page);
  await page.getByRole('link', { name: 'Log a set' }).click();
  await page.getByRole('radio', { name: 'Barbell squat' }).click();
  await page.getByRole('button', { name: 'Add set' }).click();
  await expect(page.getByText(/Set saved: Barbell squat/)).toBeVisible();

  // Move that set to yesterday, as if the workout was a day ago; dirty so sync sends the change.
  await page.evaluate(async () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    const dbs = await indexedDB.databases();
    const name = dbs.find((d) => d.name?.startsWith('body-tracker-'))!.name!;
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open(name);
      open.onsuccess = () => {
        const tx = open.result.transaction('sets', 'readwrite');
        const store = tx.objectStore('sets');
        store.getAll().onsuccess = (e) => {
          for (const s of (e.target as IDBRequest).result) store.put({ ...s, performed_at: yesterday, updated_at: new Date().toISOString(), dirty: 1 });
        };
        tx.oncomplete = () => {
          open.result.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  });

  await page.reload();
  await page.getByRole('button', { name: /^Repeat / }).click();
  await page.getByRole('button', { name: 'Log 1 set' }).click();
  await expect(page.getByText(/1 set logged from/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Barbell squat' })).toBeVisible();
});
