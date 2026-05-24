'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { apiAuth } from '@/lib/api/client';
import {
  closeSocket,
  getSocket,
  refreshSocketAuth,
  setTokenProvider,
} from '@/lib/ws/socket';
import { useAuthStore } from '@/features/auth';
import { chatKeys } from '@/services/keys';
import { useChatUIStore } from '../stores/chat-ui.store';
import { useTypingStore } from '../stores/typing.store';
import type { Message, MessagesPage, Presence } from '../types';

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

const HEARTBEAT_MS = 30_000;
const TYPING_AUTOCLEAR_MS = 6_000;

export function useChatRealtime() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  const selectedConversationId = useChatUIStore((s) => s.selectedConversationId);
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
        if (!prev) return prev;

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
      upsertMessage(message);
    }

    function onConversationNotify(payload: NotifyPayload) {
      qc.invalidateQueries({ queryKey: chatKeys.conversationLists() });
      const key = chatKeys.messages(payload.conversationId);
      if (qc.getQueryData(key)) upsertMessage(payload.message);
    }

    function onMessageRead(payload: ReadPayload) {
      const meId = useAuthStore.getState().user?.id ?? null;
      if (payload.userId !== meId) {
        const key = chatKeys.messages(payload.conversationId);
        qc.setQueryData<InfiniteData<MessagesPage> | undefined>(key, (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            pages: prev.pages.map((p) => ({
              ...p,
              items: p.items.map((m) => {
                if (m.isView) return m;
                if (m.senderId !== meId) return m;
                if (m.createdAt > payload.readAt) return m;
                return { ...m, isView: true };
              }),
            })),
          };
        });
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

    socket.on('message:new', onMessageNew);
    socket.on('conversation:notify', onConversationNotify);
    socket.on('message:read', onMessageRead);
    socket.on('presence:update', onPresenceUpdate);
    socket.on('typing', onTyping);

    const heartbeat = setInterval(() => {
      if (socket.connected) socket.emit('presence:heartbeat');
    }, HEARTBEAT_MS);

    return () => {
      socket.off('message:new', onMessageNew);
      socket.off('conversation:notify', onConversationNotify);
      socket.off('message:read', onMessageRead);
      socket.off('presence:update', onPresenceUpdate);
      socket.off('typing', onTyping);
      clearInterval(heartbeat);
      for (const t of Object.values(typingTimersRef.current)) clearTimeout(t);
      typingTimersRef.current = {};
    };
  }, [isAuthed, qc]);

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
