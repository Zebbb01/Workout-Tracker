/**
 * Someone back at the gym who forgot an exercise: find it by body part or plain
 * words, see the movement drawn, and log it.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { expectFitsWidth, needsSupabase, startTrial } from './helpers';

test.skip(needsSupabase, 'needs a Supabase with anonymous sign-ins (CI starts one)');

async function openGuide(page: Page) {
  await startTrial(page);
  await page.getByRole('link', { name: 'Log a set' }).click();
  await page.getByRole('link', { name: 'Exercise guide' }).click();
  await expect(page.getByRole('heading', { name: 'Exercises', level: 1 })).toBeVisible();
}

const search = (page: Page) => page.getByRole('searchbox', { name: 'Search exercises' });

async function expectLoaded(image: Locator) {
  await expect.poll(() => image.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBeGreaterThan(0);
}

test('find a forgotten exercise by body part, see it drawn, and log it', async ({ page }) => {
  await openGuide(page);
  await page.getByRole('radio', { name: 'Biceps' }).click();
  await search(page).fill('hammer');
  await page.getByRole('button', { name: 'Hammer curl Biceps' }).click();

  const sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('heading', { name: 'Hammer curl' })).toBeVisible();
  const drawings = sheet.getByRole('img');
  await expect(drawings).toHaveCount(2);
  await expectLoaded(drawings.first());
  await expectLoaded(drawings.last());
  await expect(sheet.getByRole('listitem').first()).toContainText('dumbbell');
  await expect(sheet.getByRole('link', { name: 'Watch a video' })).toHaveAttribute('href', /youtube\.com.*Hammer/i);

  await sheet.getByRole('link', { name: 'Log this exercise' }).click();
  await expect(page.getByRole('radio', { name: 'Hammer curl' })).toBeChecked();
  await page.getByRole('button', { name: 'Add set' }).click();
  await expect(page.getByText(/Set saved: Hammer curl/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Hammer curl' })).toBeVisible();
});

test('plain words and the equipment filter find what you can do at home', async ({ page }) => {
  await openGuide(page);
  await search(page).fill('arms');
  await expect(page.getByRole('button', { name: /^Barbell curl/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Barbell squat/ })).toBeHidden();

  await search(page).fill('');
  await page.getByRole('combobox', { name: 'Equipment' }).click();
  await page.getByRole('option', { name: 'Bodyweight' }).click();
  await expect(page.getByRole('button', { name: /^Push-ups/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pull-ups Back · Bodyweight' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Bench press/ })).toBeHidden();
  await expectFitsWidth(page.getByRole('list').first());
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

test('the drawings can be paused to compare both positions', async ({ page }) => {
  await openGuide(page);
  await page.getByRole('button', { name: /^Bench press/ }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('button', { name: 'Pause and show both positions' }).click();
  const [first, second] = await Promise.all([sheet.getByRole('img').first().boundingBox(), sheet.getByRole('img').last().boundingBox()]);
  expect(second!.x).toBeGreaterThan(first!.x + first!.width - 1);
  await expect(sheet.getByRole('button', { name: 'Play the movement' })).toBeVisible();
});

test('Back closes an exercise and keeps your search', async ({ page }) => {
  await openGuide(page);
  await search(page).fill('squat');
  await page.getByRole('button', { name: /^Barbell squat/ }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Barbell squat' })).toBeVisible();

  await page.goBack();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page).toHaveURL(/\/log\/guide$/);
  await expect(search(page)).toHaveValue('squat');
});

test('the exercise you are about to log links straight to how it is done', async ({ page }) => {
  await startTrial(page);
  await page.getByRole('link', { name: 'Log a set' }).click();
  await page.getByRole('radio', { name: 'Deadlift' }).click();
  await page.getByRole('link', { name: 'How to do it' }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Deadlift' })).toBeVisible();

  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Exercises', level: 1 })).toBeVisible();
});

test('nothing found offers to clear the search, watch a video, or add your own', async ({ page }) => {
  await openGuide(page);
  await page.getByRole('radio', { name: 'Core' }).click();
  await search(page).fill('muscle snatch');
  await expect(page.getByText('No exercise matches')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Watch a video of muscle snatch' })).toHaveAttribute('href', /youtube\.com.*muscle/i);

  await page.getByRole('button', { name: 'Add muscle snatch as your own' }).click();
  await page.getByRole('button', { name: 'Add exercise' }).click();
  await expect(page.getByRole('radio', { name: 'muscle snatch' })).toBeChecked();
  await page.getByRole('link', { name: 'Exercise guide' }).click();
  await search(page).fill('muscle');
  await expect(page.getByRole('button', { name: /^muscle snatch/ })).toBeVisible();

  await search(page).fill('zzzz');
  await page.getByRole('button', { name: 'Clear search and filters' }).click();
  await expect(page.getByRole('button', { name: /^Bench press/ })).toBeVisible();
});

test('an exercise opened once keeps its drawing with no signal', async ({ page, context }) => {
  await openGuide(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
  });
  await page.reload(); // the worker now controls the page and keeps what it loads
  await expect(page.getByRole('heading', { name: 'Exercises', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: /^Pull-ups/ }).click();
  await expectLoaded(page.getByRole('dialog').getByRole('img').first());
  await expectLoaded(page.getByRole('dialog').getByRole('img').last());

  await context.setOffline(true);
  await page.reload();
  const drawings = page.getByRole('dialog').getByRole('img');
  await expect(drawings).toHaveCount(2);
  await expectLoaded(drawings.first());
  await expect(page.getByRole('dialog').getByRole('link', { name: 'Watch a video' })).toBeHidden();
  await context.setOffline(false);
});
