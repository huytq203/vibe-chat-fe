import { describe, it, expect, vi, beforeEach } from 'vitest';
import { encryptBlob } from '@/lib/crypto/transport-cipher';

/**
 * Regression: sau login, ChatLayout bắn query ngay khi render — nếu session key chưa
 * được lập thì BE trả 401 SESSION_KEY_MISSING cho MỌI API ("login lần đầu ko load được").
 * Client PHẢI ensureSessionKey (handshake /session/key) TRƯỚC khi gửi request authed
 * non-public, và dedupe các lời gọi song song về đúng 1 handshake.
 */

const testKeyRaw = crypto.getRandomValues(new Uint8Array(32));
let testKey: CryptoKey | null = null;

// Giả lập handshake: chỉ sau khi ensureSessionKey được gọi mới có key trong RAM.
const ensureSpy = vi.fn(async (_accessToken: string) => {
  void _accessToken;
  if (testKey) return;
  testKey = await crypto.subtle.importKey(
    'raw',
    testKeyRaw,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );
});

vi.mock('@/lib/crypto/session-key', () => ({
  getSessionKey: () => testKey,
  ensureSessionKey: (...args: unknown[]) => ensureSpy(...(args as [string])),
  clearSessionKey: () => {
    testKey = null;
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

async function encryptedOkResponse(data: unknown) {
  const blob = await encryptBlob(JSON.stringify(data), testKey!);
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve({ error_code: 0, error_message: 'Successful.', data: blob }),
  };
}

describe('apiClient — ensure session key before authed request', () => {
  beforeEach(() => {
    testKey = null;
    vi.clearAllMocks();
  });

  it('lập session key TRƯỚC khi gửi request authed non-public, rồi mã hoá request', async () => {
    const { apiClient, apiAuth } = await import('@/lib/api/client');
    apiAuth.setToken('header.eyJzdWIiOiJ1MSJ9.sig'); // có token → gate ensure chạy

    mockFetch.mockImplementationOnce(() => encryptedOkResponse({ ok: true }));

    const result = await apiClient.get('/api/v1/conversations', { query: { page: 1 } });

    // handshake được gọi đúng 1 lần, TRƯỚC khi fetch data
    expect(ensureSpy).toHaveBeenCalledTimes(1);
    expect(ensureSpy.mock.invocationCallOrder[0]).toBeLessThan(
      mockFetch.mock.invocationCallOrder[0],
    );
    // vì key đã có lúc gửi → request được mã hoá (?params=<blob>), không lộ page
    const [url] = mockFetch.mock.calls[0] as [string];
    const params = new URL(url, 'http://localhost').searchParams;
    expect(params.has('params')).toBe(true);
    expect(params.has('page')).toBe(false);
    expect(result).toEqual({ ok: true });
  });

  it('mọi request authed non-public đều đi qua gate ensureSessionKey (không request nào lọt)', async () => {
    const { apiClient, apiAuth } = await import('@/lib/api/client');
    apiAuth.setToken('header.eyJzdWIiOiJ1MSJ9.sig');

    mockFetch.mockImplementation(() => encryptedOkResponse({ ok: true }));

    await Promise.all([
      apiClient.get('/api/v1/conversations'),
      apiClient.get('/api/v1/users/me'),
      apiClient.get('/api/v1/notifications/unread-count'),
    ]);

    // Client gate mỗi request → ensureSpy được gọi cho cả 3; dedupe handshake thật nằm
    // trong session-key.ts (xem session-key.test.ts). Điều cốt lõi: không request nào
    // được gửi trước khi gate chạy.
    expect(ensureSpy).toHaveBeenCalledTimes(3);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('KHÔNG ensure với public path (auth/refresh)', async () => {
    const { apiClient, apiAuth } = await import('@/lib/api/client');
    apiAuth.setToken('header.eyJzdWIiOiJ1MSJ9.sig');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ success: true, data: {}, timestamp: new Date(0).toISOString() }),
    });

    await apiClient.post('/api/v1/auth/refresh', { auth: false });
    expect(ensureSpy).not.toHaveBeenCalled();
  });

  it('KHÔNG ensure khi chưa có access token', async () => {
    const { apiClient } = await import('@/lib/api/client');
    // không setToken → accessToken null

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ success: true, data: { ok: 1 }, timestamp: new Date(0).toISOString() }),
    });

    await apiClient.get('/api/v1/health');
    expect(ensureSpy).not.toHaveBeenCalled();
  });
});
