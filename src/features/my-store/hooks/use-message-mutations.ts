'use client';

import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { myStoreApi } from '@/services/my-store.api';
import { myStoreKeys } from '@/services/keys';
import { getErrorMessage } from '@/lib/api/error-message';
import { serverNow } from '@/lib/time/server-clock';
import { useAuthStore } from '@/features/auth';
import {
  sendMessageWs,
  registerOptimisticNonce,
  unregisterOptimisticNonce,
} from '@/features/chat';
import type {
  StoreNoteType,
  CreateReminderInput,
  CreateChecklistInput,
  CreateBookmarkInput,
  PatchChecklistItemInput,
  SendStoreMessageInput,
  EditStoreMessageInput,
  StoreConversation,
  StoreMessage,
} from '@/features/my-store/types';
import {
  invalidateStoreUsage,
  patchChatMessage,
  patchMessage,
  prependMessage,
  removeMessage,
  storeMediaType,
  uploadStoreMedia,
  type MessagesCache,
} from './store-mutation-helpers';

type StoreSendContext = { tempId: string; nonce: string; selfConvId: string };

/** Lấy id hội thoại SELF từ cache — ưu tiên conversation, fallback tin đầu tiên. */
function resolveSelfConvId(qc: QueryClient): string {
  const conv = qc.getQueryData<StoreConversation>(myStoreKeys.conversation());
  if (conv?.id) return conv.id;
  const cache = qc.getQueryData<MessagesCache>(myStoreKeys.messages());
  const fromMsg = cache?.pages.flatMap((p) => p.items)[0]?.conversationId;
  if (fromMsg) return fromMsg;
  throw new Error('Chưa tải xong kho cá nhân — thử lại sau giây lát');
}

/**
 * Gửi tin TEXT vào kho cá nhân qua WebSocket + optimistic UI, giống hệt luồng chat.
 * Realtime `message:new` (useMyStoreRealtime) sẽ hoà bản thật vào cache; onSuccess dedup.
 */
export function useSendStoreMessage() {
  const qc = useQueryClient();
  const meId = useAuthStore((s) => s.user?.id ?? '');

  return useMutation<string, Error, SendStoreMessageInput, StoreSendContext>({
    mutationFn: (dto) => {
      const selfConvId = resolveSelfConvId(qc);
      const nonce = dto.clientNonce ?? crypto.randomUUID();
      return sendMessageWs(
        {
          conversationId: selfConvId,
          plaintext: dto.plaintext,
          type: dto.type ?? 'TEXT',
          replyToMessageId: dto.replyToMessageId,
        },
        nonce,
      );
    },

    onMutate: (dto): StoreSendContext => {
      const selfConvId = resolveSelfConvId(qc);
      const nonce = dto.clientNonce ?? crypto.randomUUID();
      // Stamp lại để mutationFn dùng cùng nonce (tránh nonce mismatch → WS echo nhân đôi).
      dto.clientNonce = nonce;
      const tempId = `temp-${nonce}`;
      const now = new Date(serverNow()).toISOString();

      const optimistic: StoreMessage = {
        id: tempId,
        conversationId: selfConvId,
        senderId: meId,
        type: dto.type ?? 'TEXT',
        plaintext: dto.plaintext ?? null,
        metadata: { optimistic: true, clientNonce: nonce },
        replyToMessageId: dto.replyToMessageId ?? null,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      };
      prependMessage(qc, optimistic);
      registerOptimisticNonce(selfConvId, nonce);
      return { tempId, nonce, selfConvId };
    },

    onSuccess: (messageId, _dto, ctx) => {
      qc.setQueryData<MessagesCache>(myStoreKeys.messages(), (old) => {
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
              return [{ ...m, id: messageId, metadata: { ...(m.metadata ?? {}), optimistic: false } }];
            }
            return [m];
          }),
        }));
        return { ...old, pages };
      });
      unregisterOptimisticNonce(ctx.selfConvId, ctx.nonce);
    },

    onError: (e, _dto, ctx) => {
      // Kho không có UI resend → rollback hẳn tin optimistic (đơn giản hơn chat).
      if (ctx) {
        removeMessage(qc, ctx.tempId);
        unregisterOptimisticNonce(ctx.selfConvId, ctx.nonce);
      }
      toast.error(getErrorMessage(e));
    },
  });
}

/**
 * Upload 1 file rồi gửi vào myStore dưới dạng tin media (IMAGE/VIDEO/AUDIO/FILE).
 * Bytes attachment được BE tính vào quota 5GB (sendServer, conversation SELF).
 */
export function useSendStoreMediaMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (percent: number) => void;
    }) => {
      const media = await uploadStoreMedia(file, onProgress);
      const type = storeMediaType(file.type || media.mimeType);
      return myStoreApi.sendMessage({ type, attachmentIds: [media.id] });
    },
    onSuccess: (msg) => {
      prependMessage(qc, msg);
      invalidateStoreUsage(qc, msg.conversationId);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useEditStoreMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, dto }: { messageId: string; dto: EditStoreMessageInput }) =>
      myStoreApi.editMessage(messageId, dto),
    onSuccess: (updated) => patchMessage(qc, updated.id, () => updated),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useDeleteStoreMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => myStoreApi.deleteMessage(messageId),
    onSuccess: (_, messageId) => {
      // Lấy conversationId từ cache trước khi patch để invalidate shared tabs.
      const cache = qc.getQueryData<MessagesCache>(myStoreKeys.messages());
      const convId = cache?.pages
        .flatMap((p) => p.items)
        .find((m) => m.id === messageId)?.conversationId;
      removeMessage(qc, messageId);
      invalidateStoreUsage(qc, convId);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

/** Xoá 1 ghi chú (reminder/checklist/bookmark) — gỡ ngay khỏi list, không cần reload. */
export function useDeleteStoreNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, messageId }: { type: StoreNoteType; messageId: string }) =>
      myStoreApi.deleteNote(type, messageId),
    onSuccess: (_, { messageId }) => {
      removeMessage(qc, messageId);
      toast.success('Đã xoá');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useCreateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateReminderInput) => myStoreApi.createReminder(dto),
    onSuccess: (msg) => {
      prependMessage(qc, msg);
      toast.success('Đã tạo nhắc nhở');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useCreateChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateChecklistInput) => myStoreApi.createChecklist(dto),
    onSuccess: (msg) => {
      prependMessage(qc, msg);
      toast.success('Đã tạo checklist');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useCreateBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateBookmarkInput) => myStoreApi.createBookmark(dto),
    onSuccess: (msg) => {
      prependMessage(qc, msg);
      toast.success('Đã lưu bookmark');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function usePatchChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, dto }: { messageId: string; dto: PatchChecklistItemInput; conversationId?: string }) =>
      myStoreApi.patchChecklistItem(messageId, dto),
    onSuccess: (updated, { conversationId }) => {
      patchMessage(qc, updated.id, () => updated);
      if (conversationId) {
        patchChatMessage(qc, conversationId, updated.id, (m) => ({
          ...m,
          metadata: updated.metadata as Record<string, unknown>,
        }));
      }
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}
