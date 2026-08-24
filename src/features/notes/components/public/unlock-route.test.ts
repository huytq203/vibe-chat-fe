// @vitest-environment node
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/p/[token]/unlock/route';
import { PUBLIC_PAGE_SESSION_COOKIE } from '@/services/notion.api';

vi.hoisted(() => {
  vi.stubEnv('NEXT_PUBLIC_USE_PROXY', 'false');
});

const NOTION_URL = 'http://localhost:3007';
const server = setupServer();

function request(token: string, password = 'mật-khẩu'): Request {
  return new Request(`http://localhost:3000/p/${token}/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
}

function invoke(token: string, password?: string) {
  return POST(request(token, password), { params: Promise.resolve({ token }) });
}

function successEnvelope(sessionToken: string) {
  return HttpResponse.json({
    success: true,
    data: { sessionToken },
    timestamp: '2026-08-25T00:00:00.000Z',
  });
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Route Handler mở khoá trang công khai', () => {
  it.each([
    ['sai mật khẩu', 'wrong-password'],
    ['link hết hạn', 'expired'],
    ['link bị thu hồi', 'revoked'],
    ['link không tồn tại', 'missing'],
  ])('%s trả cùng một thông điệp và cùng mã trạng thái', async (_label, token) => {
    server.use(
      http.post(`${NOTION_URL}/api/v1/public/${token}/unlock`, () =>
        HttpResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: `Lỗi riêng: ${token}` } },
          { status: 404 },
        ),
      ),
    );

    const response = await invoke(token);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: { message: 'Liên kết không hợp lệ hoặc đã hết hạn.' },
    });
  });

  it('lưu token phiên 30 phút trong cookie httpOnly và không trả token cho JavaScript', async () => {
    server.use(
      http.post(`${NOTION_URL}/api/v1/public/secure-link/unlock`, () =>
        successEnvelope('server-only-session-token')),
    );

    const response = await invoke('secure-link');
    const cookie = response.headers.get('set-cookie');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ unlocked: true });
    expect(cookie).toContain(`${PUBLIC_PAGE_SESSION_COOKIE}=server-only-session-token`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=lax');
    expect(cookie).toContain('Max-Age=1800');
    expect(cookie).toContain('Path=/p/secure-link');
  });

  it('Zod từ chối mật khẩu rỗng trước khi gọi backend', async () => {
    const response = await invoke('invalid-input', '');

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { message: 'Liên kết không hợp lệ hoặc đã hết hạn.' },
    });
  });
});
