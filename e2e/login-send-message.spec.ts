import { test, expect } from '@playwright/test';

test('login → send message → verify', async ({ page }) => {
  // Navigate to login
  await page.goto('/login');

  // Fill login form
  await page.locator('#login-username').fill('ad1');
  await page.locator('#login-password').fill('111111');

  // Click login submit button (exact match to avoid social buttons), while
  // capturing the login API response to diagnose failures fast.
  const loginResponsePromise = page.waitForResponse(
    (res) => res.url().includes('/api/v1/auth/login') && res.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const loginResponse = await loginResponsePromise;
  console.log('[login] status:', loginResponse.status(), 'body:', await loginResponse.text());
  expect(loginResponse.ok()).toBe(true);

  // Wait for redirect to chat page
  await page.waitForURL('/chat');
  await page.waitForLoadState('networkidle');

  // Wait for conversation list to load
  await page.waitForTimeout(2000);

  // Click first conversation (if exists)
  const firstConv = page.locator('[role="button"]').filter({ has: page.locator('text') }).first();
  await firstConv.click();

  // Wait for chat panel to load
  await page.waitForTimeout(1000);

  // Find message input (editor contenteditable or textarea)
  const messageInput = page.locator('[contenteditable="true"]').first();
  await messageInput.waitFor({ state: 'visible' });

  // Type message
  const testMessage = `Xin chào Halo - ${Date.now()}`;
  await messageInput.click();
  await messageInput.fill(testMessage);

  // Send message (click send button)
  const sendButton = page.locator('button').filter({ has: page.locator('svg') }).nth(0);
  // More reliable: look for button with Send icon near message input
  const allButtons = page.locator('button');
  let foundSend = false;
  for (let i = 0; i < await allButtons.count(); i++) {
    const btn = allButtons.nth(i);
    const ariaLabel = await btn.getAttribute('aria-label');
    if (ariaLabel?.includes('Gửi') || ariaLabel?.includes('send')) {
      await btn.click();
      foundSend = true;
      break;
    }
  }

  // If send button by aria-label not found, try click by visible send icon
  if (!foundSend) {
    // Find Send icon button in the message input area
    const msgContainer = messageInput.locator('xpath=ancestor::div[1]');
    const sendBtn = msgContainer.locator('button').last();
    await sendBtn.click();
  }

  // Wait for message to appear in chat
  await page.waitForTimeout(500);

  // Verify message appears in message list
  await expect(page.locator(`text=${testMessage}`)).toBeVisible();

  console.log('✅ Test passed: login → send message');
});
