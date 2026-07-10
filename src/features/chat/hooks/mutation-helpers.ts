import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { chatKeys } from '@/services/keys';
import type { Message, MessagesPage } from '@/features/chat/types';

export type MessagesCache = InfiniteData<MessagesPage, string | null>;

/** Patch 1 message theo id trong cache infinite (giữ nguyên cấu trúc trang). */
export function patchMessageInCache(
  qc: QueryClient,
  conversationId: string,
  messageId: string,
  patch: (m: Message) => Message,
): MessagesCache | undefined {
  const key = chatKeys.messages(conversationId);
  const previous = qc.getQueryData<MessagesCache>(key);
  qc.setQueryData<MessagesCache>(key, (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        items: page.items.map((m) => (m.id === messageId ? patch(m) : m)),
      })),
    };
  });
  return previous;
}

/**
 * Gộp metadata khi sửa tin: thay `richText` bằng bản mới (hoặc gỡ bỏ nếu lần sửa
 * này không còn định dạng), giữ nguyên các key metadata khác. Trả null nếu rỗng.
 */
export function mergeEditMetadata(
  old: Record<string, unknown> | null | undefined,
  next: Record<string, unknown> | undefined,
): Record<string, unknown> | null {
  const merged: Record<string, unknown> = { ...(old ?? {}) };
  delete merged.richText;
  if (next?.richText) merged.richText = next.richText;
  return Object.keys(merged).length > 0 ? merged : null;
}
