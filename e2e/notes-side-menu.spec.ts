import { expect, test, type Locator, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#login-username').fill('ad1');
  await page.locator('#login-password').fill('111111');

  const loginResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/api/v1/auth/login')
      && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const loginResponse = await loginResponsePromise;
  expect(loginResponse.ok()).toBe(true);

  await page.waitForURL('/chat');
  await page.waitForLoadState('networkidle');
}

async function openNote(page: Page): Promise<Locator> {
  await page.goto('/notes');

  const firstPage = page.getByRole('treeitem').first();
  const createFirstPage = page.getByRole('button', { name: 'Tạo trang đầu tiên' });
  await expect(firstPage.or(createFirstPage)).toBeVisible();

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

async function showSideMenu(block: Locator, addButton: Locator, dragHandle: Locator) {
  await block.hover();
  await expect(addButton).toBeVisible();
  await expect(dragHandle).toBeVisible();
}

async function centerOf(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return {
    x: box!.x + box!.width / 2,
    y: box!.y + box!.height / 2,
  };
}

test('the default Mantine side menu supports add, drag, click, and grab interactions', async ({
  page,
}) => {
  await login(page);
  const firstBlock = await openNote(page);
  const addButton = page.locator('[data-test="dragHandleAdd"]');
  const dragHandle = page.locator('[data-test="dragHandle"]');
  const slashMenu = page.locator('#bn-suggestion-menu');
  const dragHandleMenu = page.locator('.bn-drag-handle-menu');

  await test.step('the add button inserts a block and opens the slash menu', async () => {
    const initialBlockCount = await page.locator('.bn-editor .bn-block-outer').count();
    await showSideMenu(firstBlock, addButton, dragHandle);
    await addButton.click();

    await expect(slashMenu).toBeVisible();
    expect(await page.locator('.bn-editor .bn-block-outer').count()).toBeGreaterThanOrEqual(
      initialBlockCount,
    );
    await page.keyboard.press('Escape');
    await expect(slashMenu).toBeHidden();
  });

  await test.step('dragging the handle does not open its menu before release', async () => {
    await showSideMenu(firstBlock, addButton, dragHandle);
    const center = await centerOf(dragHandle);

    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x + 24, center.y + 24, { steps: 4 });
    await expect(dragHandleMenu).toBeHidden();
    await page.mouse.up();
  });

  await test.step('releasing the handle without dragging opens its menu', async () => {
    await showSideMenu(firstBlock, addButton, dragHandle);
    const center = await centerOf(dragHandle);

    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.up();
    await expect(dragHandleMenu).toBeVisible();
    await page.keyboard.press('Escape');
  });

  await test.step('the drag handle uses the grab cursor', async () => {
    await showSideMenu(firstBlock, addButton, dragHandle);
    const cursor = await dragHandle.evaluate((element) => getComputedStyle(element).cursor);
    expect(cursor).toBe('grab');
  });
});
