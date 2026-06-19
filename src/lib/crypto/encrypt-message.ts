import { getKeyMetaForConversation } from './conversation-key-store';
import { encryptString } from './message-crypto';

/** Payload mã hoá gửi lên BE khi `encrypted=true` (khớp SendServerMessageDto của BE). */
export type EncryptedSendPayload = {
  encrypted: true;
  ciphertext: string;
  iv: string;
  authTag: string;
  keyId: string;
  keyVersion: number;
};

/**
 * Mã hoá plaintext bằng DEK của conversation để gửi lên server (Phase 1).
 * Server LƯU NGUYÊN ciphertext, không re-encrypt. Ném lỗi nếu không lấy được DEK
 * → caller quyết định fallback (gửi plaintext để server tự mã hoá).
 */
export async function buildEncryptedSendPayload(
  conversationId: string,
  plaintext: string,
): Promise<EncryptedSendPayload> {
  const { key, keyId, keyVersion } = await getKeyMetaForConversation(conversationId);
  const payload = await encryptString(plaintext, key);
  return {
    encrypted: true,
    ciphertext: payload.ciphertext,
    iv: payload.iv,
    authTag: payload.authTag,
    keyId,
    keyVersion,
  };
}
