import { test, expect } from '@playwright/test';

test('quản lý bot: tạo → xem token → rotate → revoke', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.locator('#login-username').fill('ad1');
  await page.locator('#login-password').fill('111111');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL('/chat');
  await page.waitForLoadState('networkidle');

  // Mở Settings: click avatar (mở popover UserMenu) rồi click "Cài đặt" —
  // xem UserMenu.tsx: avatar có aria-label="Tài khoản", "Cài đặt" là 1 button
  // text thường bên trong PopoverContent, không phải aria-label riêng.
  await page.getByRole('button', { name: 'Tài khoản' }).click();
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();

  // Tab "Bot của tôi" — xem SettingsModal.tsx: tab là <button> thường, KHÔNG
  // có role="tab" (không dùng Base UI Tabs), nên phải chọn theo role="button".
  await page.getByRole('button', { name: 'Bot của tôi' }).click();

  // Tạo bot mới — username unique bằng timestamp, chứa "bot" (bắt buộc theo
  // createBotSchema — xem schemas.ts USERNAME_CONTAINS_BOT).
  const username = `e2e_test_bot_${Date.now()}`;
  await page.getByRole('button', { name: 'Tạo bot mới' }).click();
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Tên hiển thị').fill('E2E Test Bot');

  const createResponsePromise = page.waitForResponse(
    (res) => res.url().includes('/api/v1/bots') && res.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Tạo bot', exact: true }).click();
  const createResponse = await createResponsePromise;
  expect(createResponse.ok()).toBe(true);

  // Thấy token hiện 1 lần (TokenRevealCard render <code>{token}</code>)
  const tokenCode = page.locator('code');
  await expect(tokenCode).toBeVisible();

  // Tick xác nhận đã lưu rồi đóng ("Đóng" chỉ enable sau khi tick checkbox)
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Đóng' }).click();

  // Bot mới xuất hiện trong list
  await expect(page.getByText(username)).toBeVisible();

  // Mở quản lý token (BotRow.tsx: button "Quản lý token" trong <li>)
  const botRow = page.locator('li').filter({ hasText: username });
  await botRow.getByRole('button', { name: 'Quản lý token' }).click();
  await expect(page.getByText(/token của e2e test bot/i)).toBeVisible();

  // Rotate token đầu tiên — TokenRow.tsx: trigger "Rotate" mở AlertDialog có
  // nút xác nhận "Xác nhận rotate".
  const rotateResponsePromise = page.waitForResponse(
    (res) => res.url().includes('/rotate') && res.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Rotate', exact: true }).first().click();
  await page.getByRole('button', { name: 'Xác nhận rotate' }).click();
  const rotateResponse = await rotateResponsePromise;
  expect(rotateResponse.ok()).toBe(true);
  await expect(tokenCode).toBeVisible();
  await page.getByRole('checkbox').click();
  // Sau rotate, "Đóng" chỉ đóng TokenRevealCard (quay lại list token trong
  // panel), không đóng cả Settings modal — xem BotTokensPanel.tsx onDone.
  await page.getByRole('button', { name: 'Đóng' }).click();

  // Revoke token — quay lại list, thấy nút Revoke.
  const revokeResponsePromise = page.waitForResponse(
    (res) => res.request().method() === 'DELETE' && /\/tokens\//.test(res.url()),
  );
  await page.getByRole('button', { name: 'Revoke', exact: true }).first().click();
  await page.getByRole('button', { name: 'Xác nhận revoke' }).click();
  const revokeResponse = await revokeResponsePromise;
  expect(revokeResponse.ok()).toBe(true);
  // TokenRow.tsx hiện Badge "Đã thu hồi" trên token vừa revoke. exact:true để
  // tránh strict-mode violation với text "Tin nhắn đã thu hồi" của khung chat
  // phía sau modal (recalled message bubble, không liên quan tới bot token).
  await expect(page.getByText('Đã thu hồi', { exact: true })).toBeVisible();
});
