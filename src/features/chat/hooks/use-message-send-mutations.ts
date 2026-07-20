'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { chatKeys } from '@/services/keys';
import { serverNow } from '@/lib/time/server-clock';
import { useAuthStore } from '@/features/auth';
import { useSendErrorStore } from '@/features/chat/stores/send-error.store';
import type { Message, SendMessageInput } from '@/features/chat/types';
import { sendMessageWs } from './send-message-ws';
import { registerOptimisticNonce, unregisterOptimisticNonce } from './optimistic-nonce';
import type { MessagesCache } from './mutation-helpers';

type SendContext = {
  tempId: string;
  clientNonce: string;
  conversationId: string;
  previous: MessagesCache | undefined;
};

export function useSendMessage() {
  const qc = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id ?? '');

  return useMutation<string, Error, SendMessageInput, SendContext>({
    mutationFn: async (input) => {
      // onMutate đã stamp clientNonce vào input; dùng lại để WS echo match đúng.
      return sendMessageWs(input, input.clientNonce!);
    },

    onMutate: async (input): Promise<SendContext> => {
      const key = chatKeys.messages(input.conversationId);
      // KHÔNG cancelQueries — sẽ huỷ optimistic của tin gửi trước đó khi user
      // spam Enter. setQueryData functional update đã đủ an toàn để merge.

      const previous = qc.getQueryData<MessagesCache>(key);
      const clientNonce = input.clientNonce ?? crypto.randomUUID();
      // Stamp lại vào input để mutationFn dùng cùng nonce (tránh nonce mismatch → duplicate).
      input.clientNonce = clientNonce;
      const tempId = `temp-${clientNonce}`;
      // Mốc giờ theo SERVER (bù lệch đồng hồ máy) → hai bên hiện cùng giờ gửi.
      const nowMs = serverNow();
      const now = new Date(nowMs).toISOString();

      const optimistic: Message = {
        id: tempId,
        conversationId: input.conversationId,
        senderId: currentUserId,
        viaBotId: input.viaBotId ?? null,
        type: input.type ?? 'TEXT',
        encryptionType: 'NONE',
        plaintext: input.plaintext ?? null,
        attachments:
          input.optimisticAttachments ??
          (input.optimisticAttachment ? [input.optimisticAttachment] : []),
        contentPreview: input.plaintext ?? null,
        metadata: {
          ...(input.metadata ?? {}),
          ...(input.previewUrl ? { previewUrl: input.previewUrl } : {}),
          optimistic: true,
          clientNonce,
          inlineQueryId: input.inlineQueryId,
          inlineResultId: input.inlineResultId,
          inlineQuery: input.inlineQuery,
        },
        replyToMessageId: input.replyToMessageId ?? null,
        mentions: input.mentions,
        isEdited: false,
        isDeleted: false,
        deletedFor: 'NONE',
        // Optimistic expireAt cho tin tự huỷ → countdown hiện ngay; bản WS echo
        // từ server sẽ ghi đè bằng expireAt chuẩn (xem doc 15).
        expireAt: input.selfDestructTtl
          ? new Date(nowMs + input.selfDestructTtl * 1000).toISOString()
          : null,
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

      registerOptimisticNonce(input.conversationId, clientNonce);
      // Lượt gửi mới → xoá thông báo lỗi hệ thống của lần gửi trước.
      useSendErrorStore.getState().clear(input.conversationId);

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
      unregisterOptimisticNonce(ctx.conversationId, ctx.clientNonce);
    },

    onError: (err, vars, ctx) => {
      if (!ctx) return;
      unregisterOptimisticNonce(ctx.conversationId, ctx.clientNonce);
      // Báo lỗi dạng "tin nhắn hệ thống" ở cuối MessageList.
      useSendErrorStore.getState().setError(ctx.conversationId, err.message);
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
      useSendErrorStore.getState().clear(vars.conversationId);
      const meta = (msg.metadata ?? {}) as {
        clientNonce?: string;
        inlineQueryId?: string;
        inlineResultId?: string;
        inlineQuery?: string;
      };
      const nonce = meta.clientNonce ?? crypto.randomUUID();
      // Tin media đã upload xong (attachments có sẵn) → gửi lại nguyên attachmentIds + type.
      const attachmentIds = msg.attachments?.map((a) => a.mediaId) ?? [];

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
          plaintext: msg.plaintext ?? undefined,
          type: msg.type,
          replyToMessageId: msg.replyToMessageId ?? undefined,
          clientNonce: nonce,
          attachmentIds: attachmentIds.length ? attachmentIds : undefined,
          viaBotId: msg.viaBotId ?? undefined,
          inlineQueryId:
            typeof meta.inlineQueryId === 'string' ? meta.inlineQueryId : undefined,
          inlineResultId:
            typeof meta.inlineResultId === 'string' ? meta.inlineResultId : undefined,
          inlineQuery:
            typeof meta.inlineQuery === 'string' ? meta.inlineQuery : undefined,
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
      useSendErrorStore.getState().setError(vars.conversationId, err.message);
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
