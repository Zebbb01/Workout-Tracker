import { test, expect } from '@playwright/test';

test('a signed-out visitor is sent to the welcome screens, and can reach sign-in', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Body Tracker' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
});
