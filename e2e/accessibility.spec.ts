/**
 * Every main screen passes axe's WCAG 2.1 AA rules, contrast included, in the
 * light and the dark theme.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { needsSupabase, startTrial } from './helpers';

async function expectNoViolations(page: Page, screen: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(violations.map((v) => `${screen}: ${v.id} (${v.nodes.length}) ${v.help}`)).toEqual([]);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme });

    test('the welcome screen and its privacy page, signed out', async ({ page }) => {
      await page.goto('/welcome');
      await expect(page.getByRole('button', { name: 'Try it without an account' })).toBeVisible();
      await expectNoViolations(page, 'welcome');

      await page.getByRole('link', { name: 'Privacy' }).click();
      await expect(page).toHaveURL(/\/privacy$/);
      await expect(page.getByRole('heading', { name: 'Privacy', level: 1 })).toBeVisible();
      await expectNoViolations(page, 'privacy');
    });

    test('onboarding and every tab', async ({ page }) => {
      test.skip(needsSupabase, 'needs a Supabase with anonymous sign-ins (CI starts one)');
      await startTrial(page, { skipSetup: false });
      await expectNoViolations(page, 'onboarding');
      await page.getByRole('button', { name: 'Skip setup' }).click();

      for (const [path, heading] of [['/', 'Today'], ['/log', 'Log'], ['/meals', 'Meals'], ['/progress', 'Progress'], ['/more', 'More']]) {
        await page.goto(path);
        await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
        await expectNoViolations(page, heading);
      }

      await page.goto('/log/guide');
      await expect(page.getByRole('heading', { name: 'Exercises', level: 1 })).toBeVisible();
      await expectNoViolations(page, 'Exercises');

      await page.goto('/log/guide?e=bench-press');
      await expect(page.getByRole('dialog').getByRole('heading', { name: 'Bench press' })).toBeVisible();
      await expectNoViolations(page, 'An exercise');
    });
  });
}
