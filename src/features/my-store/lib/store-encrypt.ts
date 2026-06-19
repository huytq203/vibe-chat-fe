import type { QueryClient } from '@tanstack/react-query';
import { myStoreApi } from '@/services/my-store.api';
import { myStoreKeys } from '@/services/keys';
import { getKeyForConversation } from '@/lib/crypto/conversation-key-store';
import { encryptJson } from '@/lib/crypto/message-crypto';
import type { EncryptedMetadataBlob } from '@/features/my-store/types';

/** Resolve UUID của SELF conversation (cache qua RQ để không gọi lặp). */
export async function getStoreConversationId(qc: QueryClient): Promise<string> {
  const conv = await qc.ensureQueryData({
    queryKey: myStoreKeys.conversation(),
    queryFn: () => myStoreApi.getConversation(),
  });
  return conv.id;
}

/**
 * Mã hoá metadata nhạy cảm của note (title/note/text/url…) bằng DEK của SELF conv.
 * Trả về blob {ciphertext, iv, authTag} để gửi qua `encryptedMetadata`.
 */
export async function encryptStoreMetadata(
  qc: QueryClient,
  secret: unknown,
): Promise<EncryptedMetadataBlob> {
  const convId = await getStoreConversationId(qc);
  const key = await getKeyForConversation(convId);
  return encryptJson(secret, key);
}
