'use client';

import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
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

async function sendMessageWs(input: SendMessageInput, clientNonce: string): Promise<string> {
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
      await qc.cancelQueries({ queryKey: key });

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

    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      const key = chatKeys.messages(ctx.conversationId);
      if (ctx.previous) qc.setQueryData(key, ctx.previous);
      else qc.removeQueries({ queryKey: key });
    },
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { conversationId: string; messageId: string }) =>
      chatApi.markRead(vars.conversationId, vars.messageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: chatKeys.conversationLists() });
    },
  });
}
