import { expect, type Locator, type Page } from '@playwright/test';

export async function login(page: Page, pageLabel = 'Page') {
  console.log(`[notes] ${pageLabel} starting login at ${page.url()}`);
  await page.goto('/login');
  await page.locator('#login-username').fill('ad1');
  await page.locator('#login-password').fill('111111');

  const loginResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/api/v1/auth/login')
      && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const loginResponse = await loginResponsePromise;
  console.log(`[notes] ${pageLabel} login response status: ${loginResponse.status()}`);
  if (!loginResponse.ok()) {
    throw new Error(`Login request failed with status ${loginResponse.status()}`);
  }

  await page.waitForURL('/chat', { timeout: 15_000, waitUntil: 'domcontentloaded' });
  console.log(`[notes] ${pageLabel} login finished at ${page.url()}`);
}

export async function openNote(page: Page): Promise<Locator> {
  await page.waitForLoadState('domcontentloaded');
  console.log(`[notes] Opening notes from ${page.url()}`);
  await page.goto('/notes', { waitUntil: 'domcontentloaded' });
  console.log(`[notes] Notes navigation finished at ${page.url()}`);

  const firstPage = page.getByRole('treeitem').first();
  const createFirstPage = page.getByRole('button', { name: 'Tạo trang đầu tiên' });
  await expect(firstPage.or(createFirstPage)).toBeVisible({ timeout: 15_000 });

  if (await createFirstPage.isVisible()) {
    await createFirstPage.click();
  } else {
    await firstPage.click();
  }

  await page.waitForURL(/\/notes\/[^/]+\/[^/]+$/);
  const firstBlock = page.locator('.bn-editor .bn-block-outer').first();
  await expect(firstBlock).toBeVisible();
  return firstBlock;
}
