import { describe, it, expect, vi, beforeEach } from 'vitest';
import { encryptBlob, decryptBlob } from '@/lib/crypto/transport-cipher';

// Setup: mock session-key để trả về CryptoKey thật
const testKeyRaw = crypto.getRandomValues(new Uint8Array(32));
let testKey: CryptoKey;

vi.mock('@/lib/crypto/session-key', () => ({
  getSessionKey: () => testKey,
  clearSessionKey: vi.fn(),
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
});
