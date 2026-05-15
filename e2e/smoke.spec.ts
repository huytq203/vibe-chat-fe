import { test, expect } from '@playwright/test';

test('home page renders todo example', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /todo example/i })).toBeVisible();
  await expect(page.getByLabel(/danh sách todo/i)).toBeVisible();
});
