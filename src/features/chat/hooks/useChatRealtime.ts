'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiAuth } from '@/lib/api/client';
import {
  cipherOn,
  closeSocket,
  getSocket,
  refreshSocketAuth,
  setForceLogoutHandler,
  setTokenProvider,
} from '@/lib/ws/socket';
import { useAuthStore } from '@/features/auth';
import { useConvLockStore } from '@/features/chat/stores/conv-lock.store';
import { debouncedInvalidate } from '@/lib/query/debounced-invalidate';
import { chatKeys, friendKeys, myStoreKeys, userKeys } from '@/services/keys';
import { useTypingStore } from '@/features/chat/stores/typing.store';
import { useSelectedConversation } from './useSelectedConversation';
import type {
  Conversation,
  JoinRequestStatus,
  LastMessagePreview,
  Message,
  MessageReaction,
  MessagesPage,
  Presence,
  ReactionType,
} from '@/features/chat/types';

type NotifyPayload = { conversationId: string; message: Message };
type ReadPayload = {
  conversationId: string;
  messageId: string;
  userId: string;
  readAt: string;
};
type TypingPayload = {
  conversationId: string;
  userId: string;
  state: 'start' | 'stop';
};
type ConversationDeletedPayload = {
  conversationId: string;
  deletedBy?: string;
  deletedAt?: string;
};
// BE có thể bắn full Message (đã isDeleted=true) hoặc chỉ id — handle cả hai.
type MessageDeletedPayload =
  | Message
  | { conversationId: string; messageId: string; deletedAt?: string };

type MembersAddedPayload = {
  conversationId: string;
  addedUserIds: string[];
  addedBy?: string;
  at?: string;
};
// Hồ sơ 1 user vừa đổi (tên/avatar/ảnh bìa/bio) — bắn tới chính chủ (đa thiết bị) + bạn bè.
type UserUpdatedPayload = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  at?: string;
};
type MemberRemovedPayload = {
  conversationId: string;
  userId: string;
  removedBy?: string;
  reason?: 'KICKED' | 'LEFT';
  at?: string;
};
type JoinRequestPayload = {
  conversationId: string;
  requestId: string;
  requesterId: string;
  reason?: string | null;
  at?: string;
};
type JoinRequestResolvedPayload = {
  conversationId: string;
  requestId: string;
  status: JoinRequestStatus;
  reviewedBy?: string;
  at?: string;
};
type MuteUpdatedPayload = {
  conversationId: string;
  isMuted: boolean;
  mutedUntil: string | null;
};
// Đổi tên/mô tả/settings/isPublic của nhóm (xem 28-group-settings.md).
type ConversationUpdatedPayload = {
  conversationId: string;
  updatedBy?: string;
  at?: string;
};
// Ghim/bỏ ghim tin (xem 29-pinned-messages.md).
type PinUpdatedPayload = {
  conversationId: string;
  action: 'PINNED' | 'UNPINNED';
  messageId: string;
  by?: string;
  at?: string;
};
// Thả/đổi/gỡ cảm xúc tin nhắn (xem reactions). BE gửi summary mới + actor.
type ReactionUpdatedPayload = {
  conversationId: string;
  messageId: string;
  userId: string;
  action: 'SET' | 'REMOVED';
  type: ReactionType | null;
  reactions: MessageReaction[];
  total: number;
  at?: string;
};
const HEARTBEAT_MS = 30_000;
const TYPING_AUTOCLEAR_MS = 6_000;

/** Dựng preview cho danh sách hội thoại từ 1 Message realtime (để cập nhật cache list ngay). */
function mapMessageToPreview(m: Message): LastMessagePreview {
  return {
    id: m.id,
    senderId: m.senderId,
    type: m.type,
    preview: m.contentPreview,
    previewEncrypted: Boolean(m.encrypted),
    previewCipher: m.contentPreviewCipher ?? null,
    keyId: m.keyId ?? null,
    keyVersion: m.keyVersion ?? null,
    createdAt: m.createdAt,
  };
}

export function useChatRealtime() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  const clearSession = useAuthStore((s) => s.clear);
  const clearConvLocks = useConvLockStore((s) => s.clearAll);
  const router = useRouter();
  const { selectedConversationId, setSelected } = useSelectedConversation();
  const qc = useQueryClient();
  const joinedRef = useRef<string | null>(null);
  const typingTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Phân biệt initial connect (không cần invalidate) vs reconnect (cần bù event bị miss).
  const hasConnectedRef = useRef(false);

  useEffect(() => {
    setTokenProvider(() => apiAuth.getToken());
    apiAuth.onTokenChange((t) => refreshSocketAuth(t));
    // BE kick phiên cũ khi login thiết bị khác → xoá session local + về login ngay.
    setForceLogoutHandler(() => {
      clearSession();
      clearConvLocks();
      qc.clear();
      toast.error('Tài khoản được đăng nhập trên thiết bị khác');
      router.replace('/login');
    });
    return () => {
      apiAuth.onTokenChange(null);
      setForceLogoutHandler(null);
    };
  }, [clearSession, clearConvLocks, qc, router]);

  // Khi tab close / refresh: chủ động disconnect WS để BE đánh dấu offline ngay,
  // không phải đợi pingTimeout (~20s).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    function onUnload() {
      closeSocket();
    }
    window.addEventListener('pagehide', onUnload);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('pagehide', onUnload);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, []);

  useEffect(() => {
    if (!isAuthed) {
      joinedRef.current = null;
      closeSocket();
      return;
    }
    const token = apiAuth.getToken();
    const socket = getSocket(token);
    if (!socket) return;
    // Alias non-null để dùng an toàn trong các closure (TS widen socket về null trong closure).
    const s = socket;

    // Cập nhật 1 hội thoại trong cache danh sách TRỰC TIẾP từ WS (realtime, không refetch):
    // - message: cập nhật preview + lastMessageAt (để sắp xếp) + messageCount.
    // - bumpUnread: tăng unread (tin đến conv KHÁC, không phải mình gửi).
    // - resetUnread: đưa unread về 0 (đã đọc).
    // Trả về false nếu conv chưa có trong cache (conv mới) → caller tự refetch để kéo về.
    function patchConvInList(
      conversationId: string,
      opts: {
        message?: Message;
        bumpUnread?: boolean;
        resetUnread?: boolean;
        /** Chỉ tăng messageCount khi tin thật sự mới (tránh cộng đôi do event trùng). */
        incrementCount?: boolean;
      },
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
    }

    // Trả về true nếu message được CHÈN MỚI (không phải thay thế bản đã có theo id/nonce).
    // Caller dùng cờ này để chỉ bump messageCount/unread đúng 1 lần, idempotent với event
    // trùng (BE bắn cả message:new lẫn conversation:notify cho cùng 1 tin).
    function upsertMessage(message: Message): boolean {
      const key = chatKeys.messages(message.conversationId);
      const incomingNonce =
        (message.metadata as { clientNonce?: string } | null)?.clientNonce ?? null;
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
              return [message];
            }
            const mNonce = (m.metadata as { clientNonce?: string } | null)?.clientNonce ?? null;
            if (incomingNonce && mNonce && mNonce === incomingNonce) {
              replaced = true;
              // CONTACT: BE echo thiếu avatarUrl (enrichContactCards chỉ chạy lúc REST).
              // Giữ lại avatarUrl từ optimistic cho đến khi REST refetch enrich lại.
              if (message.type === 'CONTACT') {
                const existingContact = (m.metadata as Record<string, unknown> | null)
                  ?.contact as Record<string, unknown> | undefined;
                const incomingContact = (message.metadata as Record<string, unknown> | null)
                  ?.contact as Record<string, unknown> | undefined;
                if (existingContact?.avatarUrl != null && incomingContact && !incomingContact.avatarUrl) {
                  return [{ ...message, metadata: { ...message.metadata, contact: { ...incomingContact, avatarUrl: existingContact.avatarUrl } } }];
                }
              }
              return [message];
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
    }

    function onMessageNew(message: Message) {
      const inserted = upsertMessage(message);
      // Tin tới conv đang mở (đã join room) → cập nhật preview + thứ tự trong list NGAY,
      // KHÔNG tăng unread (user đang xem; markRead lo việc đọc). Conv lạ → refetch kéo về.
      // incrementCount=inserted: bỏ qua bump nếu tin đã có (echo/trùng event).
      if (!patchConvInList(message.conversationId, { message, incrementCount: inserted })) {
        debouncedInvalidate(qc, chatKeys.conversationLists());
      }
    }

    // Sửa tin: BE bắn full Message đã cập nhật → upsert thay theo id.
    function onMessageEdited(message: Message) {
      upsertMessage(message);
      // Preview của list có thể đổi (nếu là tin cuối) → để refetch reconcile cho chuẩn.
      debouncedInvalidate(qc, chatKeys.conversationLists());
    }

    // Gỡ tin: nếu có full Message → upsert; nếu chỉ id → patch isDeleted tại chỗ.
    function onMessageDeleted(payload: MessageDeletedPayload) {
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
    }

    function onConversationNotify(payload: NotifyPayload) {
      // Luôn upsert (kể cả cache rỗng) — đảm bảo nếu user mở conv ngay sau đó,
      // tin nhắn đã có sẵn trong cache, không bị "delay 1 vòng REST".
      const inserted = upsertMessage(payload.message);
      // Tin ở conv KHÁC (chưa mở) → tăng unread + cập nhật preview TRỰC TIẾP trong cache
      // (realtime, không chờ refetch). Bỏ qua tin mình tự gửi (thiết bị khác) & conv đang mở.
      // Chỉ bump unread/messageCount khi tin thật sự mới (idempotent với event trùng).
      const meId = useAuthStore.getState().user?.id ?? null;
      const isMine = payload.message.senderId === meId;
      const isOpen = joinedRef.current === payload.conversationId;
      const found = patchConvInList(payload.conversationId, {
        message: payload.message,
        bumpUnread: inserted && !isMine && !isOpen,
        incrementCount: inserted,
      });
      // Conv mới chưa có trong danh sách → refetch để kéo về.
      if (!found) debouncedInvalidate(qc, chatKeys.conversationLists());
    }

    // Nếu socket đã connected sẵn (singleton tái dùng) → coi như đã qua initial-connect,
    // để lần 'connect' kế tiếp được xử lý như reconnect thật (tránh kẹt cờ → bỏ lỡ catch-up).
    hasConnectedRef.current = s.connected;

    function onReconnect() {
      if (!hasConnectedRef.current) {
        // Initial connect — data vừa được fetch REST, không cần invalidate.
        hasConnectedRef.current = true;
        return;
      }
      // Reconnect thật (mất mạng, tab background lâu): connection mới mất hết room đã join
      // → re-join conv đang mở để typing/read-receipt/message:new room-scoped sống lại.
      if (joinedRef.current) {
        s.emit('conversation:join', { conversationId: joinedRef.current });
      }
      // Bù event đã miss trong gap.
      qc.invalidateQueries({ queryKey: chatKeys.all });
    }

    function onMessageRead(payload: ReadPayload) {
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
    }

    function onPresenceUpdate(payload: Presence) {
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
    }

    function onTyping(payload: TypingPayload) {
      const meId = useAuthStore.getState().user?.id ?? null;
      if (payload.userId === meId) return;
      const isStart = payload.state === 'start';
      useTypingStore
        .getState()
        .setTyping(payload.conversationId, payload.userId, isStart);
      const key = `${payload.conversationId}:${payload.userId}`;
      const timer = typingTimersRef.current[key];
      if (timer) clearTimeout(timer);
      if (isStart) {
        typingTimersRef.current[key] = setTimeout(() => {
          useTypingStore
            .getState()
            .setTyping(payload.conversationId, payload.userId, false);
          delete typingTimersRef.current[key];
        }, TYPING_AUTOCLEAR_MS);
      } else {
        delete typingTimersRef.current[key];
      }
    }

    function onConversationDeleted(payload: ConversationDeletedPayload) {
      qc.removeQueries({ queryKey: chatKeys.conversationDetail(payload.conversationId) });
      qc.removeQueries({ queryKey: chatKeys.messages(payload.conversationId) });
      debouncedInvalidate(qc, chatKeys.conversationLists());
      if (joinedRef.current === payload.conversationId) {
        joinedRef.current = null;
        setSelected(null);
      }
    }

    // Mute đồng bộ đa thiết bị của chính user (xem 22-mute-notifications.md).
    function onMuteUpdated(payload: MuteUpdatedPayload) {
      qc.setQueriesData<Conversation[]>(
        { queryKey: chatKeys.conversationLists() },
        (prev) =>
          prev
            ? prev.map((c) =>
                c.id === payload.conversationId
                  ? { ...c, isMuted: payload.isMuted, mutedUntil: payload.mutedUntil }
                  : c,
              )
            : prev,
      );
      qc.setQueryData<Conversation | undefined>(
        chatKeys.conversationDetail(payload.conversationId),
        (prev) =>
          prev ? { ...prev, isMuted: payload.isMuted, mutedUntil: payload.mutedUntil } : prev,
      );
    }

    // ─── Thành viên nhóm & yêu cầu vào nhóm (xem 16-group-members.md) ───────
    function onMembersAdded(payload: MembersAddedPayload) {
      qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(payload.conversationId) });
      debouncedInvalidate(qc, chatKeys.conversationLists());
    }

    function onMemberRemoved(payload: MemberRemovedPayload) {
      const meId = useAuthStore.getState().user?.id ?? null;
      if (payload.userId === meId) {
        // Mình bị kick / vừa rời → gỡ conversation khỏi state, đóng nếu đang mở.
        qc.removeQueries({ queryKey: chatKeys.conversationDetail(payload.conversationId) });
        qc.removeQueries({ queryKey: chatKeys.messages(payload.conversationId) });
        debouncedInvalidate(qc, chatKeys.conversationLists());
        if (joinedRef.current === payload.conversationId) {
          joinedRef.current = null;
          setSelected(null);
          toast.info(payload.reason === 'LEFT' ? 'Bạn đã rời nhóm' : 'Bạn đã bị xoá khỏi nhóm');
        }
      } else {
        qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(payload.conversationId) });
        debouncedInvalidate(qc, chatKeys.conversationLists());
      }
    }

    function onJoinRequest(payload: JoinRequestPayload) {
      // Người duyệt nhận event → refetch danh sách yêu cầu chờ duyệt.
      qc.invalidateQueries({ queryKey: chatKeys.joinRequests(payload.conversationId) });
    }

    function onJoinRequestResolved(payload: JoinRequestResolvedPayload) {
      if (payload.status === 'ACCEPTED') {
        toast.success('Bạn đã được duyệt vào nhóm');
        debouncedInvalidate(qc, chatKeys.conversationLists());
      } else if (payload.status === 'REJECTED') {
        toast.info('Yêu cầu vào nhóm bị từ chối');
      }
    }


    // Tên/mô tả/settings/isPublic đổi → refetch detail để lấy bản mới.
    function onConversationUpdated(payload: ConversationUpdatedPayload) {
      qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(payload.conversationId) });
      debouncedInvalidate(qc, chatKeys.conversationLists());
    }

    // 1 user đổi hồ sơ (tên/avatar...) → cập nhật mọi nơi hiển thị user đó mà không
    // cần user mở lại màn hình. Bao gồm chính chủ đổi ở thiết bị khác (đồng bộ header).
    function onUserUpdated(payload: UserUpdatedPayload) {
      const cur = useAuthStore.getState().user;
      // Chính mình đổi ở thiết bị/tab khác → đồng bộ auth store ngay (avatar/tên ở header).
      if (cur && cur.id === payload.userId) {
        useAuthStore.getState().setUser({
          ...cur,
          displayName: payload.displayName,
          avatarUrl: payload.avatarUrl,
        });
      }
      // Màn profile của user này lấy bản mới.
      qc.invalidateQueries({ queryKey: userKeys.profile(payload.userId) });
      // Hẹp lại: chỉ sidebar (list) + member nhóm đang mở, KHÔNG kéo theo mọi detail/
      // joinRequests/bannedMembers như chatKeys.conversations().
      debouncedInvalidate(qc, chatKeys.conversationLists());
      if (joinedRef.current) {
        debouncedInvalidate(qc, chatKeys.conversationDetail(joinedRef.current));
      }
      // Danh sách bạn bè (tên/avatar) — chỉ list, không đụng incoming/outgoing requests.
      debouncedInvalidate(qc, friendKeys.list());
    }

    // Cảm xúc tin nhắn thay đổi → patch summary tại chỗ. myReaction chỉ đổi khi
    // chính mình là người thao tác (event của người khác không động tới cảm xúc của tôi).
    function onReactionUpdated(payload: ReactionUpdatedPayload) {
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
    }

    // Ghim/bỏ ghim tin → refetch danh sách ghim + detail (pinnedCount).
    function onPinUpdated(payload: PinUpdatedPayload) {
      qc.invalidateQueries({ queryKey: chatKeys.pinnedMessages(payload.conversationId) });
      qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(payload.conversationId) });
    }

    // Tin hẹn giờ thay đổi vòng đời (tạo/sửa/huỷ/gửi/lỗi) ở thiết bị khác của chính
    // mình → đồng bộ danh sách hẹn giờ. scheduled.conversationId là UUID conversation.
    function onScheduledUpdate(payload: {
      scheduled?: { conversationId?: string };
    }) {
      const convId = payload?.scheduled?.conversationId;
      if (convId) {
        qc.invalidateQueries({ queryKey: chatKeys.scheduledMessages(convId) });
      }
    }

    // Tin hẹn giờ đã tới giờ & gửi: tin thật tới qua 'message:new', còn đây để
    // chuyển trạng thái PENDING → SENT trong danh sách hẹn giờ.
    function onScheduledSent(payload: { conversationId?: string }) {
      if (payload?.conversationId) {
        qc.invalidateQueries({
          queryKey: chatKeys.scheduledMessages(payload.conversationId),
        });
      }
    }

    const unsubMessageNew = cipherOn('message:new', onMessageNew as (data: unknown) => void);
    const unsubScheduledUpdate = cipherOn('scheduled_message:update', onScheduledUpdate as (data: unknown) => void);
    const unsubScheduledSent = cipherOn('scheduled_message:sent', onScheduledSent as (data: unknown) => void);
    const unsubConvUpdated = cipherOn('conversation:updated', onConversationUpdated as (data: unknown) => void);
    const unsubPinUpdated = cipherOn('conversation:pin_updated', onPinUpdated as (data: unknown) => void);
    const unsubReactionUpdated = cipherOn('message:reaction_updated', onReactionUpdated as (data: unknown) => void);
    const unsubMessageEdited = cipherOn('message:edited', onMessageEdited as (data: unknown) => void);
    const unsubMessageDeleted = cipherOn('message:deleted', onMessageDeleted as (data: unknown) => void);
    const unsubConvNotify = cipherOn('conversation:notify', onConversationNotify as (data: unknown) => void);
    const unsubConvDeleted = cipherOn('conversation:deleted', onConversationDeleted as (data: unknown) => void);
    const unsubMuteUpdated = cipherOn('conversation:mute_updated', onMuteUpdated as (data: unknown) => void);
    const unsubMembersAdded = cipherOn('conversation:members_added', onMembersAdded as (data: unknown) => void);
    const unsubMemberRemoved = cipherOn('conversation:member_removed', onMemberRemoved as (data: unknown) => void);
    const unsubJoinRequest = cipherOn('conversation:join_request', onJoinRequest as (data: unknown) => void);
    const unsubJoinRequestResolved = cipherOn('conversation:join_request_resolved', onJoinRequestResolved as (data: unknown) => void);
    const unsubMessageRead = cipherOn('message:read', onMessageRead as (data: unknown) => void);
    const unsubPresenceUpdate = cipherOn('presence:update', onPresenceUpdate as (data: unknown) => void);
    const unsubTyping = cipherOn('typing', onTyping as (data: unknown) => void);
    const unsubUserUpdated = cipherOn('user:updated', onUserUpdated as (data: unknown) => void);
    socket.on('connect', onReconnect);

    function sendHeartbeat() {
      if (!s.connected) return;
      // BE prune socket sau 60s mất heartbeat → trả ack { reconnect: true }
      // để FE chủ động reconnect cho sạch split-brain state.
      s.emit('presence:heartbeat', (ack: { reconnect?: boolean } | undefined) => {
        if (ack?.reconnect) {
          s.disconnect();
          s.connect();
        }
      });
    }
    const heartbeat = setInterval(sendHeartbeat, HEARTBEAT_MS);
    // Tab background → setInterval bị throttle ~1 phút → dễ bị prune. Khi tab visible
    // lại, emit ngay để đồng bộ presence trước khi user thấy stale state.
    function onVisibility() {
      if (document.visibilityState === 'visible') sendHeartbeat();
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      unsubMessageNew();
      unsubScheduledUpdate();
      unsubScheduledSent();
      unsubConvUpdated();
      unsubPinUpdated();
      unsubReactionUpdated();
      unsubMessageEdited();
      unsubMessageDeleted();
      unsubConvNotify();
      unsubConvDeleted();
      unsubMuteUpdated();
      unsubMembersAdded();
      unsubMemberRemoved();
      unsubJoinRequest();
      unsubJoinRequestResolved();
      unsubMessageRead();
      unsubPresenceUpdate();
      unsubTyping();
      unsubUserUpdated();
      socket.off('connect', onReconnect);
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', onVisibility);
      for (const t of Object.values(typingTimersRef.current)) clearTimeout(t);
      typingTimersRef.current = {};
    };
  }, [isAuthed, qc, setSelected]);

  useEffect(() => {
    if (!isAuthed) return;
    const socket = getSocket(apiAuth.getToken());
    if (!socket) return;

    const next = selectedConversationId;
    const prev = joinedRef.current;
    if (prev === next) return;

    if (prev) {
      socket.emit('conversation:leave', { conversationId: prev });
      useTypingStore.getState().clearConv(prev);
    }
    if (next) socket.emit('conversation:join', { conversationId: next });
    joinedRef.current = next;
  }, [isAuthed, selectedConversationId]);
}
