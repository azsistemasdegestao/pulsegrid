import { test, expect } from '@playwright/test';

test('submits the lead form and shows a success message', async ({ page }) => {
  await page.goto('/');

  const form = page.locator('#demo form');
  await form.locator('#name').fill('Ada Lovelace');
  await form.locator('#email').fill(`ada.${Date.now()}@example.com`);
  await form.locator('#company').fill('Analytical Engines Ltd');
  await form.locator('#message').fill('Would love to see the anomaly detection in action.');
  await form.getByRole('checkbox').check();

  await form.getByRole('button', { name: 'Request a Demo' }).click();

  await expect(page.getByText('Thanks, we got it!')).toBeVisible();
});

test('shows a validation error when the consent checkbox is left unchecked', async ({ page }) => {
  await page.goto('/');

  const form = page.locator('#demo form');
  await form.locator('#name').fill('Ada Lovelace');
  await form.locator('#email').fill('ada@example.com');
  await form.locator('#company').fill('Analytical Engines Ltd');

  await form.getByRole('button', { name: 'Request a Demo' }).click();

  await expect(page.getByText('You must accept the privacy policy to continue.')).toBeVisible();
});
