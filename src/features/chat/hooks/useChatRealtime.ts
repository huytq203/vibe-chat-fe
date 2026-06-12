'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiAuth } from '@/lib/api/client';
import {
  closeSocket,
  getSocket,
  refreshSocketAuth,
  setForceLogoutHandler,
  setTokenProvider,
} from '@/lib/ws/socket';
import { useAuthStore } from '@/features/auth';
import { useConvLockStore } from '@/features/chat/stores/conv-lock.store';
import { debouncedInvalidate } from '@/lib/query/debounced-invalidate';
import { chatKeys } from '@/services/keys';
import { useTypingStore } from '@/features/chat/stores/typing.store';
import { useSelectedConversation } from './useSelectedConversation';
import type {
  Conversation,
  JoinRequestStatus,
  Message,
  MessagesPage,
  Presence,
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
const HEARTBEAT_MS = 30_000;
const TYPING_AUTOCLEAR_MS = 6_000;

export function useChatRealtime() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  const clearSession = useAuthStore((s) => s.clear);
  const clearConvLocks = useConvLockStore((s) => s.clearAll);
  const router = useRouter();
  const { selectedConversationId, setSelected } = useSelectedConversation();
  const qc = useQueryClient();
  const joinedRef = useRef<string | null>(null);
  const typingTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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

    function upsertMessage(message: Message) {
      const key = chatKeys.messages(message.conversationId);
      const incomingNonce =
        (message.metadata as { clientNonce?: string } | null)?.clientNonce ?? null;

      qc.setQueryData<InfiniteData<MessagesPage> | undefined>(key, (prev) => {
        // Cache chưa có → tạo trang đầu chứa message này. Lần fetch sau từ REST
        // sẽ merge thêm history, không sợ duplicate vì có dedupe theo id.
        if (!prev) {
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
              return [message];
            }
            return [m];
          }),
        }));

        if (replaced) return { ...prev, pages };

        const [first, ...rest] = pages;
        const head: MessagesPage = first
          ? { ...first, items: [message, ...first.items] }
          : { items: [message], nextCursor: null };
        return { ...prev, pages: [head, ...rest] };
      });
      debouncedInvalidate(qc, chatKeys.conversationLists());
      qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(message.conversationId) });
    }

    function onMessageNew(message: Message) {
      upsertMessage(message);
    }

    // Sửa tin: BE bắn full Message đã cập nhật → upsert thay theo id.
    function onMessageEdited(message: Message) {
      upsertMessage(message);
    }

    // Gỡ tin: nếu có full Message → upsert; nếu chỉ id → patch isDeleted tại chỗ.
    function onMessageDeleted(payload: MessageDeletedPayload) {
      if ('plaintext' in payload || 'senderId' in payload) {
        upsertMessage(payload as Message);
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
      debouncedInvalidate(qc, chatKeys.conversationLists());
      // Luôn upsert (kể cả cache rỗng) — đảm bảo nếu user mở conv ngay sau đó,
      // tin nhắn đã có sẵn trong cache, không bị "delay 1 vòng REST".
      upsertMessage(payload.message);
    }

    function onReconnect() {
      // WS có thể đã miss event trong gap reconnect → refetch toàn bộ chat state.
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
      debouncedInvalidate(qc, chatKeys.conversationLists());
    }

    function onPresenceUpdate(payload: Presence) {
      const entries = qc.getQueriesData<Presence[]>({ queryKey: chatKeys.all });
      for (const [key, list] of entries) {
        if (!Array.isArray(key) || key[1] !== 'presence' || !Array.isArray(list)) continue;
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
        toast.info('Cuộc trò chuyện đã bị xoá');
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


    socket.on('message:new', onMessageNew);
    socket.on('message:edited', onMessageEdited);
    socket.on('message:deleted', onMessageDeleted);
    socket.on('conversation:notify', onConversationNotify);
    socket.on('conversation:deleted', onConversationDeleted);
    socket.on('conversation:mute_updated', onMuteUpdated);
    socket.on('conversation:members_added', onMembersAdded);
    socket.on('conversation:member_removed', onMemberRemoved);
    socket.on('conversation:join_request', onJoinRequest);
    socket.on('conversation:join_request_resolved', onJoinRequestResolved);
    socket.on('message:read', onMessageRead);
    socket.on('presence:update', onPresenceUpdate);
    socket.on('typing', onTyping);
    socket.on('connect', onReconnect);

    const s = socket;
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
      socket.off('message:new', onMessageNew);
      socket.off('message:edited', onMessageEdited);
      socket.off('message:deleted', onMessageDeleted);
      socket.off('conversation:notify', onConversationNotify);
      socket.off('conversation:deleted', onConversationDeleted);
      socket.off('conversation:mute_updated', onMuteUpdated);
      socket.off('conversation:members_added', onMembersAdded);
      socket.off('conversation:member_removed', onMemberRemoved);
      socket.off('conversation:join_request', onJoinRequest);
      socket.off('conversation:join_request_resolved', onJoinRequestResolved);
      socket.off('message:read', onMessageRead);
      socket.off('presence:update', onPresenceUpdate);
      socket.off('typing', onTyping);
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
