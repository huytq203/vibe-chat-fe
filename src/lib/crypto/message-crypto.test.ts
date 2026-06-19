import { describe, it, expect } from 'vitest';
import { createCipheriv } from 'node:crypto';
import { importDek, encryptString, decryptToString, encryptJson, decryptJson } from './message-crypto';

const KEY_B64 = Buffer.alloc(32, 9).toString('base64');

describe('message-crypto', () => {
  it('nên round-trip string đúng', async () => {
    const key = await importDek(KEY_B64);
    const payload = await encryptString('Xin chào 🌟', key);
    expect(payload.iv).toBeTruthy();
    expect(payload.authTag).toBeTruthy();
    await expect(decryptToString(payload, key)).resolves.toBe('Xin chào 🌟');
  });

  it('nên round-trip json đúng', async () => {
    const key = await importDek(KEY_B64);
    const payload = await encryptJson({ a: 1, b: 'x' }, key);
    await expect(decryptJson<{ a: number; b: string }>(payload, key)).resolves.toEqual({ a: 1, b: 'x' });
  });

  it('authTag phải dài 16 byte', async () => {
    const key = await importDek(KEY_B64);
    const { authTag } = await encryptString('hi', key);
    expect(Buffer.from(authTag, 'base64').length).toBe(16);
  });

  // Cross-check với BE: tạo ciphertext/iv/authTag bằng node:crypto (giống EnvelopeCryptoService)
  // rồi giải mã bằng decryptToString — xác nhận tách tag khớp BE.
  it('nên giải mã đúng payload được tạo bởi node:crypto (khớp BE)', async () => {
    const plaintext = 'hello from BE 🔐';
    const dekBytes = Buffer.alloc(32, 9); // cùng KEY_B64
    const iv = Buffer.from('000102030405060708090a0b', 'hex'); // IV cố định 12B

    // Tạo ciphertext + authTag bằng node:crypto (cách BE làm)
    const cipher = createCipheriv('aes-256-gcm', dekBytes, iv);
    const cipherBuf = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTagBuf = cipher.getAuthTag(); // 16B
    expect(authTagBuf.length).toBe(16);

    const payload = {
      ciphertext: cipherBuf.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTagBuf.toString('base64'),
    };

    const key = await importDek(KEY_B64);
    await expect(decryptToString(payload, key)).resolves.toBe(plaintext);
  });
});
