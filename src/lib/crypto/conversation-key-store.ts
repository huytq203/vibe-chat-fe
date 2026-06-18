import { chatApi } from '@/services/chat.api';
import { importDek } from './message-crypto';

// DEK chỉ trong RAM (module-level). Mất khi reload → fetch lại sau JWT.
// KHÔNG lưu vào localStorage/IndexedDB/cookie.
const byConversation = new Map<string, CryptoKey>();
const inflight = new Map<string, Promise<CryptoKey>>();

/**
 * Lấy CryptoKey cho conversation — trả từ cache nếu có, ngược lại fetch từ API.
 * De-dup các lời gọi đồng thời: chỉ 1 request API được tạo cho cùng conversationId.
 */
export async function getKeyForConversation(conversationId: string): Promise<CryptoKey> {
  const cached = byConversation.get(conversationId);
  if (cached) return cached;

  const running = inflight.get(conversationId);
  if (running) return running;

  const p = (async () => {
    const res = await chatApi.getConversationKey(conversationId);
    const key = await importDek(res.key);
    byConversation.set(conversationId, key);
    return key;
  })().finally(() => inflight.delete(conversationId));

  inflight.set(conversationId, p);
  return p;
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
      const key = await importDek(r.key);
      byConversation.set(r.conversationId, key);
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
