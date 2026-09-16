import { chatKeys } from '@/services/keys';
import type { MessagesPage } from '@/features/chat/types';
import type { RealtimeHandlerDeps } from './chat-realtime-cache';

/**
 * Bù event bị lỡ trong lúc mất kết nối. Trước đây invalidate `chatKeys.all` → refetch MỌI
 * query chat đang mount, kể cả toàn bộ trang của useMessages. Giờ chỉ:
 *  - refetch danh sách hội thoại (unread/preview/thứ tự),
 *  - refetch presence,
 *  - kéo trang mới nhất của conv đang mở và upsert vào cache (tin mới/sửa/gỡ trong 30 tin gần nhất).
 */
export function makeOnReconnectCatchUp(
  deps: Pick<RealtimeHandlerDeps, 'qc' | 'joinedRef' | 'upsertMessage'>,
  fetchLatest: (conversationId: string) => Promise<MessagesPage>,
): () => Promise<void> {
  const { qc, joinedRef, upsertMessage } = deps;
  return async function onReconnectCatchUp(): Promise<void> {
    void qc.invalidateQueries({ queryKey: chatKeys.conversationLists() });
    void qc.invalidateQueries({ queryKey: chatKeys.presenceAll() });
    const conversationId = joinedRef.current;
    if (!conversationId) return;
    try {
      const page = await fetchLatest(conversationId);
      // BE trả mới → cũ; upsert cũ → mới để insert đúng vị trí thời gian.
      for (const message of [...page.items].reverse()) upsertMessage(message);
    } catch {
      // Best-effort: mất mạng lại → lần reconnect sau sẽ bù tiếp.
    }
  };
}
