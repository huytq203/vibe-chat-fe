import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { mediaApi } from '@/services/media.api';
import { myStoreKeys, chatKeys } from '@/services/keys';
import type { MediaResponse, Message, MessagesPage } from '@/features/chat/types';
import type { MessageType, StoreMessage, StoreMessagesPage } from '@/features/my-store/types';

export type MessagesCache = InfiniteData<StoreMessagesPage, string | null>;

/** Prepend 1 message mới vào đầu trang đầu của cache infinite. */
export function prependMessage(qc: QueryClient, message: StoreMessage) {
  qc.setQueryData<MessagesCache>(myStoreKeys.messages(), (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: [
        { ...old.pages[0], items: [message, ...(old.pages[0]?.items ?? [])] },
        ...old.pages.slice(1),
      ],
    };
  });
}

/** Gỡ hẳn 1 message khỏi cache infinite (dùng cho xoá ghi chú → biến mất ngay). */
export function removeMessage(qc: QueryClient, messageId: string) {
  qc.setQueryData<MessagesCache>(myStoreKeys.messages(), (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        items: page.items.filter((m) => m.id !== messageId),
      })),
    };
  });
}

/** Patch 1 message trong cache infinite. */
export function patchMessage(
  qc: QueryClient,
  messageId: string,
  patch: (m: StoreMessage) => StoreMessage,
) {
  qc.setQueryData<MessagesCache>(myStoreKeys.messages(), (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        items: page.items.map((m) => (m.id === messageId ? patch(m) : m)),
      })),
    };
  });
}

/** Patch 1 message trong chat cache (chatKeys.messages) — dùng để sync checklist từ bubble. */
export function patchChatMessage(
  qc: QueryClient,
  conversationId: string,
  messageId: string,
  patch: (m: Message) => Message,
) {
  type ChatCache = InfiniteData<MessagesPage, string | null>;
  qc.setQueryData<ChatCache>(chatKeys.messages(conversationId), (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        items: page.items.map((m) => (m.id === messageId ? patch(m) : m)),
      })),
    };
  });
}

const SHARED_TYPES = ['MEDIA', 'FILE', 'LINK'] as const;

/**
 * Sau khi gửi/gỡ tin có media trong myStore: refetch quota (cập nhật thanh dung lượng)
 * + refetch shared tabs (Ảnh/Video, Tài liệu, Liên kết) để hiển thị realtime.
 */
export function invalidateStoreUsage(qc: QueryClient, conversationId?: string): void {
  qc.invalidateQueries({ queryKey: myStoreKeys.quota() });
  if (conversationId) {
    for (const t of SHARED_TYPES) {
      qc.invalidateQueries({ queryKey: chatKeys.shared(conversationId, t) });
    }
  }
}

/** Suy ra message type từ mime của file (ảnh/video/audio/khác). */
export function storeMediaType(mime: string): MessageType {
  if (mime.startsWith('image/')) return 'IMAGE';
  if (mime.startsWith('video/')) return 'VIDEO';
  if (mime.startsWith('audio/')) return 'AUDIO';
  return 'FILE';
}

// > 10MB hoặc video → presigned URL (Cách B); còn lại upload trực tiếp (Cách A).
const DIRECT_UPLOAD_MAX = 10 * 1024 * 1024;

/** Upload 1 file lên media storage rồi trả về MediaAsset đã READY. */
export async function uploadStoreMedia(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<MediaResponse> {
  const isVideo = file.type.startsWith('video/');
  if (!isVideo && file.size <= DIRECT_UPLOAD_MAX) {
    return mediaApi.uploadDirect(file, 'ATTACHMENT', onProgress);
  }
  const pre = await mediaApi.presign({
    category: isVideo ? 'VIDEO' : 'ATTACHMENT',
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    fileSize: file.size,
  });
  await mediaApi.putToStorage(pre.uploadUrl, file, pre.contentType, onProgress);
  return mediaApi.confirm(pre.id);
}
