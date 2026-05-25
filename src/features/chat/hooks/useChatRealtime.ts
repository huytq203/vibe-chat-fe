'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiAuth } from '@/lib/api/client';
import {
  closeSocket,
  getSocket,
  refreshSocketAuth,
  setTokenProvider,
} from '@/lib/ws/socket';
import { useAuthStore } from '@/features/auth';
import { chatKeys } from '@/services/keys';
import { useTypingStore } from '../stores/typing.store';
import { useSelectedConversation } from './useSelectedConversation';
import type { Conversation, Message, MessagesPage, Presence } from '../types';

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

const HEARTBEAT_MS = 30_000;
const TYPING_AUTOCLEAR_MS = 6_000;

export function useChatRealtime() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  const { selectedConversationId, setSelected } = useSelectedConversation();
  const qc = useQueryClient();
  const joinedRef = useRef<string | null>(null);
  const typingTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    setTokenProvider(() => apiAuth.getToken());
    apiAuth.onTokenChange((t) => refreshSocketAuth(t));
    return () => {
      apiAuth.onTokenChange(null);
    };
  }, []);

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
      qc.invalidateQueries({ queryKey: chatKeys.conversationLists() });
      qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(message.conversationId) });
    }

    function onMessageNew(message: Message) {
      console.log('[ws message:new]', message.id, message.conversationId);
      upsertMessage(message);
    }

    function onConversationNotify(payload: NotifyPayload) {
      console.log('[ws conversation:notify]', payload.conversationId, payload.message.id);
      qc.invalidateQueries({ queryKey: chatKeys.conversationLists() });
      // Luôn upsert (kể cả cache rỗng) — đảm bảo nếu user mở conv ngay sau đó,
      // tin nhắn đã có sẵn trong cache, không bị "delay 1 vòng REST".
      upsertMessage(payload.message);
    }

    function onReconnect() {
      // WS có thể đã miss event trong gap reconnect → refetch toàn bộ chat state.
      console.log('[ws reconnect] invalidating chat queries');
      qc.invalidateQueries({ queryKey: chatKeys.all });
    }

    function onMessageRead(payload: ReadPayload) {
      const meId = useAuthStore.getState().user?.id ?? null;
      console.log('[ws message:read]', payload, 'me=', meId);
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
      qc.invalidateQueries({ queryKey: chatKeys.conversationLists() });
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
      qc.invalidateQueries({ queryKey: chatKeys.conversationLists() });
      if (joinedRef.current === payload.conversationId) {
        joinedRef.current = null;
        setSelected(null);
        toast.info('Cuộc trò chuyện đã bị xoá');
      }
    }

socket.on('message:new', onMessageNew);
    socket.on('conversation:notify', onConversationNotify);
    socket.on('conversation:deleted', onConversationDeleted);
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
      socket.off('conversation:notify', onConversationNotify);
      socket.off('conversation:deleted', onConversationDeleted);
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
