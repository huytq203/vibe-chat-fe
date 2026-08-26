import { expect, test, type Page } from '@playwright/test';
import { login, openNote } from './helpers/notes';

async function openCommentsPanel(page: Page) {
  await page.getByRole('button', { name: 'Mở bảng bên' }).click();

  const panel = page.getByRole('complementary', { name: 'Bảng bên ghi chú' });
  await panel.getByRole('tab', { name: 'Bình luận' }).click();
  await expect(panel.getByTestId('comment-thread-loading')).toBeHidden();
  await expect(panel.getByRole('textbox', { name: 'Viết bình luận…' })).toBeVisible();
  return panel;
}

test('a comment appears on another page in real time without reloading', async ({ browser }) => {
  test.setTimeout(60_000);
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  // Emulate Electron in context B so its DESKTOP session does not revoke context A's WEB refresh token.
  await contextB.addInitScript(() => {
    (window as unknown as { electronAPI?: unknown }).electronAPI = { isElectron: true };
  });
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  try {
    // Both pages use the same account, so this test does not cover permission differences between users.
    await login(pageA, 'Page A');
    await login(pageB, 'Page B');
    await openNote(pageA);

    const noteUrl = pageA.url();
    await pageB.goto(noteUrl);
    await pageB.waitForURL(/\/notes\/[^/]+\/[^/]+$/);
    await expect(pageB.locator('.bn-editor .bn-block-outer').first()).toBeVisible({
      timeout: 15_000,
    });

    const [panelA, panelB] = await Promise.all([
      openCommentsPanel(pageA),
      openCommentsPanel(pageB),
    ]);
    const commentText = `Realtime comment ${Date.now()}`;

    await panelA.getByRole('textbox', { name: 'Viết bình luận…' }).fill(commentText);
    await panelA.getByRole('button', { name: 'Gửi', exact: true }).click();

    await expect(panelB.getByText(commentText, { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  } catch (error) {
    console.error(
      `[notes] Realtime test failed. Page A: ${pageA.url()}. Page B: ${pageB.url()}.`,
      error,
    );
    throw error;
  } finally {
    await Promise.all([contextA.close(), contextB.close()]);
  }
});
