import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./conversation-key-store', () => ({
  getKeyMetaForConversation: vi.fn(),
}));

import { getKeyMetaForConversation } from './conversation-key-store';
import { buildEncryptedSendPayload } from './encrypt-message';
import { importDek, decryptToString } from './message-crypto';

const KEY_B64 = Buffer.alloc(32, 9).toString('base64');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('buildEncryptedSendPayload', () => {
  it('nên trả payload encrypted=true kèm keyId/keyVersion và ciphertext giải mã lại đúng', async () => {
    const key = await importDek(KEY_B64);
    vi.mocked(getKeyMetaForConversation).mockResolvedValue({ key, keyId: 'k-uuid', keyVersion: 3 });

    const payload = await buildEncryptedSendPayload('conv-1', 'Bí mật 🤫');

    expect(payload.encrypted).toBe(true);
    expect(payload.keyId).toBe('k-uuid');
    expect(payload.keyVersion).toBe(3);
    expect(payload.ciphertext).toBeTruthy();
    expect(payload.iv).toBeTruthy();
    expect(payload.authTag).toBeTruthy();
    // Round-trip: ciphertext mã hoá bằng cùng DEK phải giải mã lại đúng plaintext.
    await expect(
      decryptToString({ ciphertext: payload.ciphertext, iv: payload.iv, authTag: payload.authTag }, key),
    ).resolves.toBe('Bí mật 🤫');
    expect(getKeyMetaForConversation).toHaveBeenCalledWith('conv-1');
  });

  it('nên ném lỗi khi không lấy được DEK', async () => {
    vi.mocked(getKeyMetaForConversation).mockRejectedValue(new Error('404'));
    await expect(buildEncryptedSendPayload('conv-x', 'hi')).rejects.toThrow();
  });
});
