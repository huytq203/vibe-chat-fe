import { describe, it, expect, vi, beforeEach } from 'vitest';
import { encryptBlob } from '@/lib/crypto/transport-cipher';

// Setup: mock session-key để trả về CryptoKey thật
const testKeyRaw = crypto.getRandomValues(new Uint8Array(32));
let testKey: CryptoKey;

vi.mock('@/lib/crypto/session-key', () => ({
  getSessionKey: () => testKey,
  clearSessionKey: vi.fn(),
  ensureSessionKey: vi.fn(),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('apiClient cipher integration', () => {
  beforeEach(async () => {
    testKey = await crypto.subtle.importKey(
      'raw', testKeyRaw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'],
    );
    vi.clearAllMocks();
  });

  it('encrypts GET query params into ?params=<blob>', async () => {
    const responseData = { conversations: [] };
    const blob = await encryptBlob(JSON.stringify(responseData), testKey);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ error_code: 0, error_message: 'Successful.', data: blob }),
    });

    const { apiClient } = await import('@/lib/api/client');
    const result = await apiClient.get('/api/v1/conversations', { query: { page: 1, limit: 10 } });

    const [url] = mockFetch.mock.calls[0] as [string];
    const searchParams = new URL(url, 'http://localhost').searchParams;
    expect(searchParams.has('params')).toBe(true);
    expect(searchParams.has('page')).toBe(false); // original params hidden

    expect(result).toEqual(responseData);
  });

  it('unwraps `.data` from an enveloped ciphered response (list endpoint)', async () => {
    // Plaintext của list endpoint là envelope { data, meta } → caller phải nhận mảng đã bóc,
    // không phải nguyên envelope (nếu không, .filter/.map trên "page" sẽ vỡ — regression E2E).
    const conversations = [{ id: 'c1', type: 'GROUP' }, { id: 'c2', type: 'DIRECT' }];
    const blob = await encryptBlob(
      JSON.stringify({ data: conversations, meta: { page: 1, limit: 30 } }),
      testKey,
    );
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ error_code: 0, error_message: 'Successful.', data: blob }),
    });

    const { apiClient } = await import('@/lib/api/client');
    const result = await apiClient.get<typeof conversations>('/api/v1/conversations');

    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual(conversations);
  });

  it('returns a bare ciphered payload unchanged (no envelope)', async () => {
    const blob = await encryptBlob(JSON.stringify({ ok: true }), testKey);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ error_code: 0, error_message: 'Successful.', data: blob }),
    });

    const { apiClient } = await import('@/lib/api/client');
    const result = await apiClient.post('/api/v1/conversations/direct', { body: { userId: 'u1' } });

    expect(result).toEqual({ ok: true });
  });
});
