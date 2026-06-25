import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';

// Mock fetch before importing module
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Generate a real server X25519 pub key (raw 32 bytes, base64) for mocking
function makeServerEphPubKey(): string {
  const { publicKey } = generateKeyPairSync('x25519');
  const spki = Buffer.from(publicKey.export({ type: 'spki', format: 'der' }) as Buffer);
  return spki.subarray(12).toString('base64');
}

describe('session-key', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('establishSessionKey sets a CryptoKey in memory', async () => {
    const serverEphPubKey = makeServerEphPubKey();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ error_code: 0, data: { serverEphPubKey } }),
    });

    const { establishSessionKey, getSessionKey } = await import('./session-key');
    await establishSessionKey('user123', 'fake-token');

    const key = getSessionKey();
    expect(key).not.toBeNull();
    expect(key?.type).toBe('secret');
    expect(key?.algorithm.name).toBe('AES-GCM');
  });

  it('clearSessionKey removes the key', async () => {
    const { clearSessionKey, getSessionKey } = await import('./session-key');
    clearSessionKey();
    expect(getSessionKey()).toBeNull();
  });
});
