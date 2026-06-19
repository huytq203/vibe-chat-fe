import { chatApi } from '@/services/chat.api';
import { importDek } from './message-crypto';

/** DEK đã import + metadata (keyId/keyVersion) cần đính kèm khi gửi tin mã hoá. */
export type ConversationKey = { key: CryptoKey; keyId: string; keyVersion: number };

// DEK chỉ trong RAM (module-level). Mất khi reload → fetch lại sau JWT.
// KHÔNG lưu vào localStorage/IndexedDB/cookie.
const byConversation = new Map<string, ConversationKey>();
const inflight = new Map<string, Promise<ConversationKey>>();

/**
 * Lấy DEK + metadata cho conversation — trả từ cache nếu có, ngược lại fetch từ API.
 * De-dup các lời gọi đồng thời: chỉ 1 request API được tạo cho cùng conversationId.
 */
export async function getKeyMetaForConversation(conversationId: string): Promise<ConversationKey> {
  const cached = byConversation.get(conversationId);
  if (cached) return cached;

  const running = inflight.get(conversationId);
  if (running) return running;

  const p = (async () => {
    const res = await chatApi.getConversationKey(conversationId);
    const entry: ConversationKey = {
      key: await importDek(res.key),
      keyId: res.keyId,
      keyVersion: res.keyVersion,
    };
    byConversation.set(conversationId, entry);
    return entry;
  })().finally(() => inflight.delete(conversationId));

  inflight.set(conversationId, p);
  return p;
}

/** Lấy CryptoKey cho conversation (giải mã/mã hoá). Tương thích ngược caller cũ. */
export async function getKeyForConversation(conversationId: string): Promise<CryptoKey> {
  return (await getKeyMetaForConversation(conversationId)).key;
}

/**
 * Warm cache hàng loạt cho danh sách conversation (ví dụ khi load danh sách hội thoại).
 * Chỉ request những id chưa có trong cache.
 */
export async function primeKeys(conversationIds: string[]): Promise<void> {
  const missing = conversationIds.filter((id) => !byConversation.has(id));
  if (missing.length === 0) return;

  const list = await chatApi.getConversationKeys(missing);
  await Promise.all(
    list.map(async (r) => {
      const entry: ConversationKey = {
        key: await importDek(r.key),
        keyId: r.keyId,
        keyVersion: r.keyVersion,
      };
      byConversation.set(r.conversationId, entry);
    }),
  );
}

/** Xoá DEK của 1 conversation khỏi RAM (ví dụ khi rời nhóm). */
export function clearKey(conversationId: string): void {
  byConversation.delete(conversationId);
}

/** Xoá toàn bộ DEK khỏi RAM (ví dụ khi logout). */
export function clearAll(): void {
  byConversation.clear();
}
