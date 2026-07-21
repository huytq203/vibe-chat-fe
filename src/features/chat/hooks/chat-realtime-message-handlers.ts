import { type InfiniteData } from '@tanstack/react-query';
import { debouncedInvalidate } from '@/lib/query/debounced-invalidate';
import { chatKeys } from '@/services/keys';
import { useAuthStore } from '@/features/auth';
import { useTypingStore } from '@/features/chat/stores/typing.store';
import type { Conversation, Message, MessagesPage, Presence } from '@/features/chat/types';
import { getMemberRuntimeAliases, resolveMemberRuntimeId } from '@/features/chat/utils';
import type { RealtimeHandlerDeps } from './chat-realtime-cache';
import type {
  MessageDeletedPayload,
  NotifyPayload,
  ReactionUpdatedPayload,
  ReadPayload,
} from './chat-realtime-types';

export function makeOnMessageNew(deps: RealtimeHandlerDeps): (message: Message) => void {
  const { qc, patchConvInList, upsertMessage } = deps;
  return function onMessageNew(message: Message) {
    // Tin nhắn đã tới thì sender không còn ở trạng thái đang nhập.
    const conversation = qc.getQueryData<Conversation>(
      chatKeys.conversationDetail(message.conversationId),
    );
    const canonicalSenderId = resolveMemberRuntimeId(conversation, message.senderId);
    for (const userId of getMemberRuntimeAliases(conversation, canonicalSenderId)) {
      useTypingStore.getState().setTyping(message.conversationId, userId, false);
    }
    if (canonicalSenderId !== message.senderId) {
      useTypingStore
        .getState()
        .setTyping(message.conversationId, message.senderId, false);
    }
    const inserted = upsertMessage(message);
    // Tin tới conv đang mở (đã join room) → cập nhật preview + thứ tự trong list NGAY,
    // KHÔNG tăng unread (user đang xem; markRead lo việc đọc). Conv lạ → refetch kéo về.
    // incrementCount=inserted: bỏ qua bump nếu tin đã có (echo/trùng event).
    if (!patchConvInList(message.conversationId, { message, incrementCount: inserted })) {
      debouncedInvalidate(qc, chatKeys.conversationLists());
    }
  };
}

// Sửa tin: BE bắn full Message đã cập nhật → upsert thay theo id.
export function makeOnMessageEdited(deps: RealtimeHandlerDeps): (message: Message) => void {
  const { qc, upsertMessage } = deps;
  return function onMessageEdited(message: Message) {
    upsertMessage(message);
    // Preview của list có thể đổi (nếu là tin cuối) → để refetch reconcile cho chuẩn.
    debouncedInvalidate(qc, chatKeys.conversationLists());
  };
}

// Gỡ tin: nếu có full Message → upsert; nếu chỉ id → patch isDeleted tại chỗ.
export function makeOnMessageDeleted(
  deps: RealtimeHandlerDeps,
): (payload: MessageDeletedPayload) => void {
  const { qc, upsertMessage } = deps;
  return function onMessageDeleted(payload: MessageDeletedPayload) {
    if ('plaintext' in payload || 'senderId' in payload) {
      upsertMessage(payload as Message);
      debouncedInvalidate(qc, chatKeys.conversationLists());
      return;
    }
    const { conversationId, messageId } = payload;
    const key = chatKeys.messages(conversationId);
    qc.setQueryData<InfiniteData<MessagesPage> | undefined>(key, (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pages: prev.pages.map((p) => ({
          ...p,
          items: p.items.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  isDeleted: true,
                  deletedFor: 'EVERYONE',
                  plaintext: null,
                  contentPreview: null,
                  attachments: [],
                }
              : m,
          ),
        })),
      };
    });
    debouncedInvalidate(qc, chatKeys.conversationLists());
  };
}

export function makeOnConversationNotify(
  deps: RealtimeHandlerDeps,
): (payload: NotifyPayload) => void {
  const { qc, joinedRef, patchConvInList, upsertMessage, shouldBumpUnread } = deps;
  return function onConversationNotify(payload: NotifyPayload) {
    // Luôn upsert (kể cả cache rỗng) — đảm bảo nếu user mở conv ngay sau đó,
    // tin nhắn đã có sẵn trong cache, không bị "delay 1 vòng REST".
    const inserted = upsertMessage(payload.message);
    // Tin ở conv KHÁC (chưa mở) → tăng unread + cập nhật preview TRỰC TIẾP trong cache
    // (realtime, không chờ refetch). Bỏ qua tin mình tự gửi (thiết bị khác) & conv đang mở.
    // bumpUnread dùng dedupe RIÊNG (shouldBumpUnread), KHÔNG dùng `inserted`: message:new
    // có thể đã insert nội dung tin này trước đó (race), khiến `inserted=false` dù badge
    // chưa từng được tăng cho tin này.
    const meId = useAuthStore.getState().user?.id ?? null;
    const isMine = payload.message.senderId === meId;
    const isOpen = joinedRef.current === payload.conversationId;
    const found = patchConvInList(payload.conversationId, {
      message: payload.message,
      bumpUnread: !isMine && !isOpen && shouldBumpUnread(payload.message.id),
      incrementCount: inserted,
    });
    // Conv mới chưa có trong danh sách → refetch để kéo về.
    if (!found) debouncedInvalidate(qc, chatKeys.conversationLists());
  };
}

export function makeOnMessageRead(deps: RealtimeHandlerDeps): (payload: ReadPayload) => void {
  const { qc } = deps;
  return function onMessageRead(payload: ReadPayload) {
    const meId = useAuthStore.getState().user?.id ?? null;
    const key = chatKeys.messages(payload.conversationId);
    const readAtMs = new Date(payload.readAt).getTime();

    if (payload.userId !== meId) {
      // Người KHÁC đọc → tick "đã xem" cho tin của tôi gửi (createdAt ≤ readAt).
      qc.setQueryData<InfiniteData<MessagesPage> | undefined>(key, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          pages: prev.pages.map((p) => ({
            ...p,
            items: p.items.map((m) => {
              if (m.isView) return m;
              if (m.senderId !== meId) return m;
              if (new Date(m.createdAt).getTime() > readAtMs) return m;
              return { ...m, isView: true };
            }),
          })),
        };
      });
    } else {
      // CHÍNH tôi đọc (từ tab/device khác) → reset unreadCount của conv.
      qc.setQueriesData<Conversation[]>(
        { queryKey: chatKeys.conversationLists() },
        (prev) => {
          if (!prev) return prev;
          return prev.map((c) =>
            c.id === payload.conversationId ? { ...c, unreadCount: 0 } : c,
          );
        },
      );
      qc.setQueryData<Conversation | undefined>(
        chatKeys.conversationDetail(payload.conversationId),
        (prev) => (prev ? { ...prev, unreadCount: 0 } : prev),
      );
    }
    // KHÔNG invalidate conversationLists — đã set unread=0 trực tiếp ở trên. Refetch ở đây
    // sẽ kéo về số cũ (server chưa kịp commit read) → badge nhảy lại số cũ.
  };
}

export function makeOnPresenceUpdate(deps: RealtimeHandlerDeps): (payload: Presence) => void {
  const { qc } = deps;
  return function onPresenceUpdate(payload: Presence) {
    // Chỉ quét nhánh presence thay vì toàn bộ cache chat (presence:update tần suất cao).
    const entries = qc.getQueriesData<Presence[]>({
      queryKey: [...chatKeys.all, 'presence'],
    });
    for (const [key, list] of entries) {
      if (!Array.isArray(list)) continue;
      const idx = list.findIndex((p) => p.userId === payload.userId);
      if (idx === -1) continue;
      const next = list.slice();
      next[idx] = { ...next[idx], ...payload };
      qc.setQueryData(key, next);
    }
  };
}

// Cảm xúc tin nhắn thay đổi → patch summary tại chỗ. myReaction chỉ đổi khi
// chính mình là người thao tác (event của người khác không động tới cảm xúc của tôi).
export function makeOnReactionUpdated(
  deps: RealtimeHandlerDeps,
): (payload: ReactionUpdatedPayload) => void {
  const { qc } = deps;
  return function onReactionUpdated(payload: ReactionUpdatedPayload) {
    const meId = useAuthStore.getState().user?.id ?? null;
    const key = chatKeys.messages(payload.conversationId);
    qc.setQueryData<InfiniteData<MessagesPage> | undefined>(key, (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pages: prev.pages.map((p) => ({
          ...p,
          items: p.items.map((m) => {
            if (m.id !== payload.messageId) return m;
            const myReaction =
              payload.userId === meId
                ? payload.action === 'SET'
                  ? payload.type
                  : null
                : (m.myReaction ?? null);
            return { ...m, reactions: payload.reactions, myReaction };
          }),
        })),
      };
    });
  };
}
