/**
 * When something the app depends on fails, a person gets one plain sentence and
 * a way forward: never an error code, HTML, a stack trace or a provider's JSON.
 */
import { expect, test, type Page } from '@playwright/test';
import { needsSupabase, startTrial } from './helpers';

const NEEDS_SUPABASE = 'needs a Supabase with anonymous sign-ins (CI starts one)';

async function expectNoRawDetail(page: Page, ...details: string[]) {
  const text = await page.locator('body').innerText();
  for (const detail of ['<html', '{"', 'TypeError', 'Failed to fetch', 'Cannot read', ...details]) {
    expect(text, `the page shows "${detail}"`).not.toContain(detail);
  }
}

test('a sign-in service failure reads as one plain sentence', async ({ page }) => {
  await page.route('**/auth/v1/signup**', (route) =>
    route.fulfill({ status: 500, json: { code: 'unexpected_failure', msg: 'Database error saving new user' } }),
  );
  await page.goto('/welcome');
  await page.getByRole('button', { name: 'Try it without an account' }).click();
  await expect(page.getByText("Sign-in didn't work. Try again in a minute.")).toBeVisible();
  await expectNoRawDetail(page, 'Database error');
  await expect(page.getByRole('button', { name: 'Try it without an account' })).toBeEnabled();
});

test('text put in the address never reaches the page', async ({ page }) => {
  await page.goto(`/welcome?auth_error=${encodeURIComponent('Unable to exchange external code: 4/0AbCd')}`);
  await expect(page.getByText("Sign-in didn't work. Try again in a minute.")).toBeVisible();
  await expectNoRawDetail(page, 'exchange external code');
});

test.describe('before the sign-in code has loaded', () => {
  // On the deployed site the worker would fetch the file itself, out of reach of page.route.
  test.use({ serviceWorkers: 'block' });

  test('losing the connection reads as plain words', async ({ page }) => {
    await page.goto('/welcome');
    await expect(page.getByRole('button', { name: 'Try it without an account' })).toBeVisible();
    // Everything the first tap would still have to fetch.
    await page.route('**/_next/static/**', (route) => route.abort('failed'));
    await page.getByRole('button', { name: 'Try it without an account' }).click();
    await expect(page.getByText("Couldn't reach the sign-in service. Check your connection, then try again.")).toBeVisible();
    await expectNoRawDetail(page, 'ChunkLoadError');
    await expect(page.getByRole('button', { name: 'Try it without an account' })).toBeEnabled();
  });
});

test.describe('signed in', () => {
  test.skip(needsSupabase, NEEDS_SUPABASE);

  async function askForEstimate(page: Page) {
    await page.goto('/meals?add=1');
    await page.getByRole('button', { name: /Describe it/ }).click();
    await page.getByLabel('What did you eat?').fill('2 eggs and toast');
    await page.getByRole('button', { name: 'Estimate' }).click();
  }

  const FAILED = "The estimate didn't work. Try again, or enter the numbers yourself.";

  for (const [what, reply, detail] of [
    ['a 503 with an HTML body', { status: 503, contentType: 'text/html', body: '<html><body>upstream connect error</body></html>' }, 'upstream'],
    ['a provider error in JSON', { status: 502, json: { error: { code: 503, message: 'The model is overloaded', status: 'UNAVAILABLE' } } }, 'overloaded'],
  ] as const) {
    test(`an estimate that fails with ${what} still lets you enter the numbers`, async ({ page }) => {
      await startTrial(page);
      await page.route('**/api/nutrition', (route) => route.fulfill(reply));
      await askForEstimate(page);
      await expect(page.getByText(FAILED)).toBeVisible();
      await expectNoRawDetail(page, detail);
      await expect(page.getByLabel('Meal name')).toBeEditable();
    });
  }

  test('an estimate with no connection to the server says so', async ({ page }) => {
    await startTrial(page);
    await page.route('**/api/nutrition', (route) => route.abort('failed'));
    await askForEstimate(page);
    await expect(page.getByText("Couldn't reach the estimate service. Try again, or enter the numbers yourself.")).toBeVisible();
    await expectNoRawDetail(page);
    await expect(page.getByLabel('Meal name')).toBeEditable();
  });

  test("the app's own explanation of a failed estimate is shown as written", async ({ page }) => {
    await startTrial(page);
    const message = "You've used today's estimates. Enter the numbers yourself, or try again tomorrow.";
    await page.route('**/api/nutrition', (route) => route.fulfill({ status: 429, json: { error: message } }));
    await askForEstimate(page);
    await expect(page.getByText(message)).toBeVisible();
  });

  test('a crash in the data layer offers a retry instead of a blank page', async ({ page }) => {
    await startTrial(page);
    // DataProvider reads this while it renders, above every screen, so no tab can catch it.
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'onLine', {
        get() {
          throw new TypeError('startup detail');
        },
      });
    });
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expectNoRawDetail(page, 'startup detail');
  });

  test('a page that does not exist says so and links back to Today', async ({ page }) => {
    await startTrial(page);
    const response = await page.goto('/no-such-page');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    await page.getByRole('link', { name: 'Back to Today' }).click();
    await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
  });

  test('a screen that crashes keeps the tabs, so there is a way out', async ({ page }) => {
    await startTrial(page);
    // A row no sync could produce: every screen can assume a meal has calories.
    await page.evaluate(async () => {
      const dbs = await indexedDB.databases();
      const name = dbs.find((d) => d.name?.startsWith('body-tracker-'))!.name!;
      await new Promise<void>((resolve, reject) => {
        const open = indexedDB.open(name);
        open.onsuccess = () => {
          const tx = open.result.transaction('meals', 'readwrite');
          tx.objectStore('meals').put({ id: 'broken-row', name: 'Broken', calories: null, eaten_at: new Date().toISOString(), deleted_at: null, dirty: 0 });
          tx.oncomplete = () => {
            open.result.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      });
    });

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expectNoRawDetail(page);

    await page.getByRole('link', { name: 'More' }).click();
    await expect(page.getByRole('heading', { name: 'More', level: 1 })).toBeVisible();
  });
});
