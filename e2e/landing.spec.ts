import { test, expect } from '@playwright/test';

test('renders the landing page with hero, nav, and footer', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toContainText('decisions, instantly');
  await expect(page.getByRole('banner').getByRole('link', { name: 'Pulsegrid' })).toBeVisible();
  await expect(page.getByRole('link', { name: /privacy policy/i }).first()).toBeVisible();
});

test('navigates to the privacy policy page', async ({ page }) => {
  await page.goto('/');

  await page
    .getByRole('link', { name: /privacy policy/i })
    .first()
    .click();

  await expect(page).toHaveURL(/\/privacy-policy$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Privacy Policy');
});
