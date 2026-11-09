/**
 * The welcome screen is the first thing a visitor sees, usually on a phone. It
 * carries only what it needs; the database and account code arrive on the first tap.
 */
import { gzipSync } from 'node:zlib';
import { expect, test } from '@playwright/test';

test('the welcome screen loads without the local database or the account code', async ({ page }) => {
  const scripts: Promise<Buffer>[] = [];
  page.on('response', (response) => {
    if (new URL(response.url()).pathname.endsWith('.js')) scripts.push(response.body());
  });

  await page.goto('/welcome', { waitUntil: 'networkidle' });
  await expect(page.getByRole('button', { name: 'Try it without an account' })).toBeVisible();

  const bodies = await Promise.all(scripts);
  expect(bodies.length).toBeGreaterThan(0);
  for (const body of bodies) {
    const text = body.toString('utf8');
    expect(text, 'the local database').not.toContain('DexieError');
    expect(text, 'the Supabase client').not.toContain('GoTrueClient');
    expect(text, 'the select menu library').not.toContain('SelectTrigger');
  }

  const kilobytes = bodies.reduce((sum, body) => sum + gzipSync(body).length, 0) / 1024;
  expect(Math.round(kilobytes), 'kilobytes of JavaScript, gzipped').toBeLessThan(180);
});
