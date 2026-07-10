import type { MutableRefObject } from 'react';
import { type InfiniteData, type QueryClient } from '@tanstack/react-query';
import { debouncedInvalidate } from '@/lib/query/debounced-invalidate';
import { chatKeys, myStoreKeys } from '@/services/keys';
import { useAuthStore } from '@/features/auth';
import { peekOptimisticNonce } from './optimistic-nonce';
import type {
  Conversation,
  LastMessagePreview,
  Message,
  MessagesPage,
} from '@/features/chat/types';

/** Dựng preview cho danh sách hội thoại từ 1 Message realtime (để cập nhật cache list ngay). */
function mapMessageToPreview(m: Message): LastMessagePreview {
  return {
    id: m.id,
    senderId: m.senderId,
    type: m.type,
    preview: m.contentPreview,
    createdAt: m.createdAt,
  };
}

type PatchConvInListOpts = {
  message?: Message;
  bumpUnread?: boolean;
  resetUnread?: boolean;
  /** Chỉ tăng messageCount khi tin thật sự mới (tránh cộng đôi do event trùng). */
  incrementCount?: boolean;
};

export type PatchConvInList = (conversationId: string, opts: PatchConvInListOpts) => boolean;
export type UpsertMessage = (message: Message) => boolean;
export type ShouldBumpUnread = (messageId: string) => boolean;

export type RealtimeHandlerDeps = {
  qc: QueryClient;
  joinedRef: MutableRefObject<string | null>;
  setSelected: (id: string | null) => void;
  typingTimersRef: MutableRefObject<Record<string, ReturnType<typeof setTimeout>>>;
  patchConvInList: PatchConvInList;
  upsertMessage: UpsertMessage;
  shouldBumpUnread: ShouldBumpUnread;
};

// Cập nhật 1 hội thoại trong cache danh sách TRỰC TIẾP từ WS (realtime, không refetch):
// - message: cập nhật preview + lastMessageAt (để sắp xếp) + messageCount.
// - bumpUnread: tăng unread (tin đến conv KHÁC, không phải mình gửi).
// - resetUnread: đưa unread về 0 (đã đọc).
// Trả về false nếu conv chưa có trong cache (conv mới) → caller tự refetch để kéo về.
export function makePatchConvInList(qc: QueryClient): PatchConvInList {
  return function patchConvInList(
    conversationId: string,
    opts: PatchConvInListOpts,
  ): boolean {
    let found = false;
    qc.setQueriesData<Conversation[]>(
      { queryKey: chatKeys.conversationLists() },
      (prev) => {
        if (!prev) return prev;
        let changed = false;
        const next = prev.map((c) => {
          if (c.id !== conversationId) return c;
          found = true;
          changed = true;
          const patched: Conversation = { ...c };
          if (opts.message) {
            patched.lastMessage = mapMessageToPreview(opts.message);
            patched.lastMessageAt = opts.message.createdAt;
            if (opts.incrementCount) patched.messageCount = c.messageCount + 1;
          }
          if (opts.resetUnread) patched.unreadCount = 0;
          else if (opts.bumpUnread) patched.unreadCount = c.unreadCount + 1;
          return patched;
        });
        return changed ? next : prev;
      },
    );
    return found;
  };
}

// Dedupe RIÊNG cho quyết định bump unread — KHÔNG dùng chung cờ `inserted` của
// upsertMessage (nội dung). Lý do: BE có thể bắn cả message:new lẫn conversation:notify
// cho cùng 1 tin; nếu message:new xử lý trước (insert nội dung, không bump), upsertMessage
// coi tin đó là "đã có" khi conversation:notify tới sau → bumpUnread bị bỏ qua sai, badge
// không tăng cho tới khi reload. Set này chỉ theo dõi "đã bump cho message.id này chưa",
// độc lập với việc nội dung đã được insert bởi event nào.
const MAX_TRACKED_NOTIFY_IDS = 500;

export function makeShouldBumpUnread(): ShouldBumpUnread {
  const seen = new Set<string>();
  return function shouldBumpUnread(messageId: string): boolean {
    if (seen.has(messageId)) return false;
    seen.add(messageId);
    if (seen.size > MAX_TRACKED_NOTIFY_IDS) {
      const oldest = seen.values().next().value;
      if (oldest !== undefined) seen.delete(oldest);
    }
    return true;
  };
}

// Trả về true nếu message được CHÈN MỚI (không phải thay thế bản đã có theo id/nonce).
// Caller dùng cờ này để chỉ bump messageCount/unread đúng 1 lần, idempotent với event
// trùng (BE bắn cả message:new lẫn conversation:notify cho cùng 1 tin).
export function makeUpsertMessage(qc: QueryClient): UpsertMessage {
  return function upsertMessage(message: Message): boolean {
    const key = chatKeys.messages(message.conversationId);
    const meId = useAuthStore.getState().user?.id ?? null;
    // Server thường echo clientNonce trong metadata; nếu không có (server chưa hỗ trợ)
    // → fallback sang registry FIFO để tránh flash duplicate khi WS đến trước onSuccess.
    const serverNonce =
      (message.metadata as { clientNonce?: string } | null)?.clientNonce ?? null;
    const incomingNonce =
      serverNonce ?? (message.senderId === meId ? peekOptimisticNonce(message.conversationId) : null);
    let inserted = false;

    qc.setQueryData<InfiniteData<MessagesPage> | undefined>(key, (prev) => {
      // Cache chưa có → tạo trang đầu chứa message này. Lần fetch sau từ REST
      // sẽ merge thêm history, không sợ duplicate vì có dedupe theo id.
      if (!prev) {
        inserted = true;
        return {
          pages: [{ items: [message], nextCursor: null }],
          pageParams: [null],
        };
      }

      let replaced = false;
      const pages = prev.pages.map((p) => ({
        ...p,
        items: p.items.flatMap((m) => {
          if (m.id === message.id) {
            replaced = true;
            // Giữ clientNonce từ cache → stable React key, không remount bubble.
            const existingNonce =
              (m.metadata as { clientNonce?: string } | null)?.clientNonce ?? null;
            if (existingNonce) {
              return [
                {
                  ...message,
                  metadata: {
                    ...(message.metadata ?? {}),
                    clientNonce: existingNonce,
                  } as Record<string, unknown>,
                },
              ];
            }
            return [message];
          }
          const mNonce = (m.metadata as { clientNonce?: string } | null)?.clientNonce ?? null;
          if (incomingNonce && mNonce && mNonce === incomingNonce) {
            replaced = true;
            // Giữ clientNonce trong metadata để MessageList dùng làm stable key —
            // tránh React unmount/mount lại bubble khi id đổi từ temp→real.
            const mergedMeta: Record<string, unknown> = { ...(message.metadata ?? {}), clientNonce: mNonce };
            let merged = { ...message, metadata: mergedMeta };
            // CONTACT: BE echo thiếu avatarUrl (enrichContactCards chỉ chạy lúc REST).
            if (message.type === 'CONTACT') {
              const existingContact = (m.metadata as Record<string, unknown> | null)
                ?.contact as Record<string, unknown> | undefined;
              const incomingContact = (message.metadata as Record<string, unknown> | null)
                ?.contact as Record<string, unknown> | undefined;
              if (existingContact?.avatarUrl != null && incomingContact && !incomingContact.avatarUrl) {
                merged = { ...merged, metadata: { ...(merged.metadata as Record<string, unknown>), contact: { ...incomingContact, avatarUrl: existingContact.avatarUrl } } };
              }
            }
            return [merged];
          }
          return [m];
        }),
      }));

      if (replaced) return { ...prev, pages };

      inserted = true;
      const [first, ...rest] = pages;
      const head: MessagesPage = first
        ? { ...first, items: [message, ...first.items] }
        : { items: [message], nextCursor: null };
      return { ...prev, pages: [head, ...rest] };
    });
    // KHÔNG invalidate conversationLists ở đây — badge unread/preview được cập nhật
    // TRỰC TIẾP qua patchConvInList ở các handler (realtime, tránh refetch ghi đè
    // optimistic markRead → "về 0 rồi nhảy lại số cũ").
    // Detail vẫn invalidate (debounce) để conv ĐANG MỞ tự mark-read tin mới + làm tươi.
    debouncedInvalidate(qc, chatKeys.conversationDetail(message.conversationId));

    // Shared tabs (Ảnh/Tài liệu/Liên kết) trong ContactInfo — invalidate theo loại tin.
    const msgType = message.type;
    if (msgType === 'IMAGE' || msgType === 'VIDEO' || msgType === 'AUDIO') {
      debouncedInvalidate(qc, chatKeys.shared(message.conversationId, 'MEDIA'));
    } else if (msgType === 'FILE') {
      debouncedInvalidate(qc, chatKeys.shared(message.conversationId, 'FILE'));
    } else if (msgType === 'TEXT') {
      // TEXT có thể chứa link được BE index vào tab Liên kết.
      debouncedInvalidate(qc, chatKeys.shared(message.conversationId, 'LINK'));
    }

    // Kho của tôi (SELF conv): refresh thêm quota dung lượng.
    const selfConvId = qc.getQueryData<{ id: string }>(myStoreKeys.conversation())?.id;
    if (selfConvId && message.conversationId === selfConvId) {
      qc.invalidateQueries({ queryKey: myStoreKeys.quota() });
    }

    return inserted;
  };
}
