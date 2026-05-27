'use client';

import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { chatApi } from '@/services/chat.api';
import { chatKeys } from '@/services/keys';
import { apiAuth } from '@/lib/api/client';
import { getSocket } from '@/lib/ws/socket';
import { useAuthStore } from '@/features/auth';
import type { Message, MessagesPage, SendMessageInput } from '../types';

type MessagesCache = InfiniteData<MessagesPage, string | null>;
type SendAck = { ok: true; messageId: string } | { ok: false; error?: string };

type SendContext = {
  tempId: string;
  clientNonce: string;
  conversationId: string;
  previous: MessagesCache | undefined;
};

const WS_SEND_TIMEOUT_MS = 10_000;

// Outbox queue serial per conversation: chỉ emit tin tiếp theo khi tin trước đã có
// ack (hoặc fail). Tránh nhiều emitWithAck song song khi user spam Enter — vừa giảm
// race ở cache, vừa giữ đúng thứ tự khi BE serialize per-socket.
const sendQueues = new Map<string, Promise<unknown>>();

async function emitSend(input: SendMessageInput, clientNonce: string): Promise<string> {
  const socket = getSocket(apiAuth.getToken());
  if (!socket || !socket.connected) {
    throw new Error('Không có kết nối realtime');
  }
  const t0 = performance.now();
  const ack = (await socket
    .timeout(WS_SEND_TIMEOUT_MS)
    .emitWithAck('message:send', {
      conversationId: input.conversationId,
      plaintext: input.plaintext,
      clientNonce,
      type: input.type ?? 'TEXT',
      replyToMessageId: input.replyToMessageId,
    })) as SendAck;
  const dt = Math.round(performance.now() - t0);
  // eslint-disable-next-line no-console
  console.log('[ws message:send]', { nonce: clientNonce, ms: dt, ack });
  if (!ack || ack.ok !== true) {
    throw new Error((ack as { error?: string })?.error ?? 'Gửi thất bại');
  }
  return ack.messageId;
}

function sendMessageWs(input: SendMessageInput, clientNonce: string): Promise<string> {
  const convId = input.conversationId;
  const prev = sendQueues.get(convId) ?? Promise.resolve();
  // Mỗi tin chờ tin trước resolve (kể cả khi prev reject — dùng .catch để không
  // làm chain chết). UI optimistic vẫn hiện ngay, chỉ network bị queue.
  const next = prev
    .catch(() => undefined)
    .then(() => emitSend(input, clientNonce));
  sendQueues.set(convId, next);
  // Cleanup map entry khi queue rỗng để không giữ ref vĩnh viễn.
  void next.finally(() => {
    if (sendQueues.get(convId) === next) sendQueues.delete(convId);
  });
  return next;
}

export function useSendMessage() {
  const qc = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id ?? '');

  return useMutation<string, Error, SendMessageInput, SendContext>({
    mutationFn: async (input) => {
      const nonce = input.clientNonce ?? crypto.randomUUID();
      return sendMessageWs(input, nonce);
    },

    onMutate: async (input): Promise<SendContext> => {
      const key = chatKeys.messages(input.conversationId);
      // KHÔNG cancelQueries — sẽ huỷ optimistic của tin gửi trước đó khi user
      // spam Enter. setQueryData functional update đã đủ an toàn để merge.

      const previous = qc.getQueryData<MessagesCache>(key);
      const clientNonce = input.clientNonce ?? crypto.randomUUID();
      const tempId = `temp-${clientNonce}`;
      const now = new Date().toISOString();

      const optimistic: Message = {
        id: tempId,
        conversationId: input.conversationId,
        senderId: currentUserId,
        type: input.type ?? 'TEXT',
        encryptionType: 'SERVER',
        plaintext: input.plaintext,
        encrypted: null,
        contentPreview: input.plaintext,
        metadata: { optimistic: true, clientNonce },
        replyToMessageId: input.replyToMessageId ?? null,
        isEdited: false,
        isDeleted: false,
        isView: false,
        createdAt: now,
      };

      qc.setQueryData<MessagesCache>(key, (old) => {
        if (!old || old.pages.length === 0) {
          return {
            pages: [{ items: [optimistic], nextCursor: null }],
            pageParams: [null],
          };
        }
        const [first, ...rest] = old.pages;
        return {
          ...old,
          pages: [{ ...first, items: [optimistic, ...first.items] }, ...rest],
        };
      });

      return { tempId, clientNonce, conversationId: input.conversationId, previous };
    },

    onSuccess: (messageId, _vars, ctx) => {
      if (!ctx) return;
      const key = chatKeys.messages(ctx.conversationId);
      qc.setQueryData<MessagesCache>(key, (old) => {
        if (!old) return old;
        let alreadyHasReal = false;
        const pages = old.pages.map((page) => ({
          ...page,
          items: page.items.flatMap((m) => {
            if (m.id === messageId) {
              alreadyHasReal = true;
              return [m];
            }
            if (m.id === ctx.tempId) {
              if (alreadyHasReal) return [];
              return [
                {
                  ...m,
                  id: messageId,
                  metadata: { ...(m.metadata ?? {}), optimistic: false },
                },
              ];
            }
            return [m];
          }),
        }));
        return { ...old, pages };
      });
    },

    onError: (err, vars, ctx) => {
      if (!ctx) return;
      const key = chatKeys.messages(ctx.conversationId);
      // Giữ message lỗi trong cache để user resend, không rollback.
      qc.setQueryData<MessagesCache>(key, (old) => {
        if (!old) return old;
        const pages = old.pages.map((page) => ({
          ...page,
          items: page.items.map((m) =>
            m.id === ctx.tempId
              ? {
                  ...m,
                  metadata: {
                    ...(m.metadata ?? {}),
                    optimistic: false,
                    failed: true,
                    error: err.message,
                    plaintext: vars.plaintext,
                    replyToMessageId: vars.replyToMessageId ?? null,
                    type: vars.type ?? 'TEXT',
                  },
                }
              : m,
          ),
        }));
        return { ...old, pages };
      });
    },
  });
}

export function useResendMessage() {
  const qc = useQueryClient();

  return useMutation<string, Error, { conversationId: string; tempId: string }>({
    mutationFn: async (vars) => {
      const key = chatKeys.messages(vars.conversationId);
      const cache = qc.getQueryData<MessagesCache>(key);
      const msg = cache?.pages.flatMap((p) => p.items).find((m) => m.id === vars.tempId);
      if (!msg) throw new Error('Không tìm thấy tin nhắn để gửi lại');
      const meta = (msg.metadata ?? {}) as {
        clientNonce?: string;
        plaintext?: string;
        replyToMessageId?: string | null;
        type?: SendMessageInput['type'];
      };
      const nonce = meta.clientNonce ?? crypto.randomUUID();
      const plaintext = meta.plaintext ?? msg.plaintext ?? '';

      // Bỏ flag failed, hiện "Đang gửi…" lại.
      qc.setQueryData<MessagesCache>(key, (old) => {
        if (!old) return old;
        const pages = old.pages.map((page) => ({
          ...page,
          items: page.items.map((m) =>
            m.id === vars.tempId
              ? {
                  ...m,
                  metadata: { ...(m.metadata ?? {}), optimistic: true, failed: false, error: null },
                }
              : m,
          ),
        }));
        return { ...old, pages };
      });

      return sendMessageWs(
        {
          conversationId: vars.conversationId,
          plaintext,
          type: meta.type ?? 'TEXT',
          replyToMessageId: meta.replyToMessageId ?? undefined,
          clientNonce: nonce,
        },
        nonce,
      );
    },

    onSuccess: (messageId, vars) => {
      const key = chatKeys.messages(vars.conversationId);
      qc.setQueryData<MessagesCache>(key, (old) => {
        if (!old) return old;
        let alreadyHasReal = false;
        const pages = old.pages.map((page) => ({
          ...page,
          items: page.items.flatMap((m) => {
            if (m.id === messageId) {
              alreadyHasReal = true;
              return [m];
            }
            if (m.id === vars.tempId) {
              if (alreadyHasReal) return [];
              return [
                {
                  ...m,
                  id: messageId,
                  metadata: { ...(m.metadata ?? {}), optimistic: false, failed: false },
                },
              ];
            }
            return [m];
          }),
        }));
        return { ...old, pages };
      });
    },

    onError: (err, vars) => {
      const key = chatKeys.messages(vars.conversationId);
      qc.setQueryData<MessagesCache>(key, (old) => {
        if (!old) return old;
        const pages = old.pages.map((page) => ({
          ...page,
          items: page.items.map((m) =>
            m.id === vars.tempId
              ? {
                  ...m,
                  metadata: {
                    ...(m.metadata ?? {}),
                    optimistic: false,
                    failed: true,
                    error: err.message,
                  },
                }
              : m,
          ),
        }));
        return { ...old, pages };
      });
    },
  });
}

export function useDiscardFailedMessage() {
  const qc = useQueryClient();
  return (conversationId: string, tempId: string) => {
    const key = chatKeys.messages(conversationId);
    qc.setQueryData<MessagesCache>(key, (old) => {
      if (!old) return old;
      const pages = old.pages.map((page) => ({
        ...page,
        items: page.items.filter((m) => m.id !== tempId),
      }));
      return { ...old, pages };
    });
  };
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => chatApi.deleteConversation(conversationId),
    onSuccess: (_res, conversationId) => {
      qc.removeQueries({ queryKey: chatKeys.conversationDetail(conversationId) });
      qc.removeQueries({ queryKey: chatKeys.messages(conversationId) });
      qc.invalidateQueries({ queryKey: chatKeys.conversationLists() });
      toast.success('Đã xoá cuộc trò chuyện');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { conversationId: string; messageId: string }) =>
      chatApi.markRead(vars.conversationId, vars.messageId),
    onMutate: (vars) => {
      // Optimistic: badge unread của conv = 0 ngay khi user mở conv.
      qc.setQueriesData<import('../types').Conversation[]>(
        { queryKey: chatKeys.conversationLists() },
        (prev) =>
          prev
            ? prev.map((c) => (c.id === vars.conversationId ? { ...c, unreadCount: 0 } : c))
            : prev,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chatKeys.conversationLists() });
    },
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; memberIds: string[] }) =>
      chatApi.createGroup(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chatKeys.conversationLists() });
    },
  });
}

export function useSetNickname() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      conversationId,
      userId,
      nickname,
    }: {
      conversationId: string;
      userId: string;
      nickname: string | null;
    }) => chatApi.setNickname(conversationId, userId, nickname),
    onSuccess: (_, { conversationId }) => {
      qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(conversationId) });
    },
  });
}
