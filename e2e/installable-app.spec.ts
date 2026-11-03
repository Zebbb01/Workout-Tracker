/**
 * Body Tracker installs as an app and opens without a connection.
 *
 * Signed out throughout: the browser fetches all of this before anyone signs
 * in. A manifest or worker that redirects to sign-in is no manifest at all.
 *
 * The app never registers its worker on localhost (see RegisterServiceWorker),
 * so these tests register it the way the deployed site does.
 */
import { test, expect, chromium, type Page } from '@playwright/test';

async function withServiceWorker(page: Page) {
  await page.goto('/welcome');
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
  });
}

test('the manifest, its icons, the worker and the offline page load signed out', async ({ request }) => {
  const manifest = await request.get('/manifest.webmanifest', { maxRedirects: 0 });
  expect(manifest.status()).toBe(200);
  const { name, display, icons } = await manifest.json();
  expect(name).toBe('Body Tracker');
  expect(display).toBe('standalone');
  expect(icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);

  for (const { src } of icons as { src: string }[]) {
    const icon = await request.get(src, { maxRedirects: 0 });
    expect(icon.status(), src).toBe(200);
    expect(icon.headers()['content-type'], src).toBe('image/png');
  }
  for (const path of ['/sw.js', '/offline.html', '/apple-icon.png']) {
    expect((await request.get(path, { maxRedirects: 0 })).status(), path).toBe(200);
  }
});

test('Chrome offers to install Body Tracker, and the Install app button appears', async ({ baseURL }) => {
  // Chrome never offers install in an off-the-record profile, and every context
  // Playwright makes by default is one, so this runs in a throwaway real
  // profile with full Chromium. The flag skips Chrome's wait for repeat visits.
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    baseURL,
    args: ['--bypass-app-banner-engagement-checks'],
  });
  try {
    const page = await context.newPage();
    await withServiceWorker(page);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Install app' })).toBeVisible();
  } finally {
    await context.close();
  }
});

test('a page opened once still opens offline', async ({ page, context }) => {
  await withServiceWorker(page);
  await page.reload(); // the worker now controls the page and keeps it
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  await context.setOffline(false);
});

test('a page never opened says it is offline instead of a browser error', async ({ page, context }) => {
  await withServiceWorker(page);
  await context.setOffline(true);
  await page.goto('/onboarding').catch(() => {});
  await expect(page.getByRole('heading', { name: "You're offline" })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await context.setOffline(false);
});
