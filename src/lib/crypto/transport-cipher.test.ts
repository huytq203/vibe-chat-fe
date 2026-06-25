import { describe, it, expect } from 'vitest';
import { encryptBlob, decryptBlob } from './transport-cipher';

async function makeKey(): Promise<CryptoKey> {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

describe('transport-cipher', () => {
  it('round-trips plaintext', async () => {
    const key = await makeKey();
    const original = JSON.stringify({ hello: 'world', n: 42 });
    expect(await decryptBlob(await encryptBlob(original, key), key)).toBe(original);
  });

  it('produces different blob each call', async () => {
    const key = await makeKey();
    const [a, b] = await Promise.all([encryptBlob('x', key), encryptBlob('x', key)]);
    expect(a).not.toBe(b);
  });

  it('throws on tampered data', async () => {
    const key = await makeKey();
    const blob = await encryptBlob('secret', key);
    const bytes = Uint8Array.from(atob(blob), c => c.charCodeAt(0));
    bytes[20] ^= 0xff;
    const tampered = btoa(String.fromCharCode(...bytes));
    await expect(decryptBlob(tampered, key)).rejects.toThrow();
  });
});
