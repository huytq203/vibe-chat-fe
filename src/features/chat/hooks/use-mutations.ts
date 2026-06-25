'use client';

import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { chatApi, type UpdateConversationInput } from '@/services/chat.api';
import { chatKeys } from '@/services/keys';
import { ApiError, apiAuth } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/error-message';
import { debouncedInvalidate } from '@/lib/query/debounced-invalidate';
import { getSocket } from '@/lib/ws/socket';
import { buildEncryptedSendPayload } from '@/lib/crypto/encrypt-message';
import { serverNow } from '@/lib/time/server-clock';
import { useAuthStore } from '@/features/auth';
import { useSelectedConversation } from './useSelectedConversation';
import { useConvLockStore } from '@/features/chat/stores/conv-lock.store';
import { useSendErrorStore } from '@/features/chat/stores/send-error.store';
import type {
  Conversation,
  DeleteMessageInput,
  EditMessageInput,
  GroupSettings,
  Message,
  MessagesPage,
  SendMessageInput,
} from '@/features/chat/types';

type MessagesCache = InfiniteData<MessagesPage, string | null>;

/** Patch 1 message theo id trong cache infinite (giữ nguyên cấu trúc trang). */
function patchMessageInCache(
  qc: ReturnType<typeof useQueryClient>,
  conversationId: string,
  messageId: string,
  patch: (m: Message) => Message,
): MessagesCache | undefined {
  const key = chatKeys.messages(conversationId);
  const previous = qc.getQueryData<MessagesCache>(key);
  qc.setQueryData<MessagesCache>(key, (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        items: page.items.map((m) => (m.id === messageId ? patch(m) : m)),
      })),
    };
  });
  return previous;
}
/**
 * Gộp metadata khi sửa tin: thay `richText` bằng bản mới (hoặc gỡ bỏ nếu lần sửa
 * này không còn định dạng), giữ nguyên các key metadata khác. Trả null nếu rỗng.
 */
function mergeEditMetadata(
  old: Record<string, unknown> | null | undefined,
  next: Record<string, unknown> | undefined,
): Record<string, unknown> | null {
  const merged: Record<string, unknown> = { ...(old ?? {}) };
  delete merged.richText;
  if (next?.richText) merged.richText = next.richText;
  return Object.keys(merged).length > 0 ? merged : null;
}

type SendAck = { ok: true; messageId: string } | { ok: false; error?: string };

type SendContext = {
  tempId: string;
  clientNonce: string;
  conversationId: string;
  previous: MessagesCache | undefined;
};

const WS_SEND_TIMEOUT_MS = 10_000;
const sendQueues = new Map<string, Promise<unknown>>();

async function emitSend(input: SendMessageInput, clientNonce: string): Promise<string> {
  const socket = getSocket(apiAuth.getToken());
  if (!socket || !socket.connected) {
    throw new Error('Không có kết nối realtime');
  }

  // Phase 1: mã hoá content ở FE bằng DEK trước khi gửi (plaintext KHÔNG rời máy).
  // Nếu không lấy được DEK → fallback gửi plaintext để server tự mã hoá (không chặn user).
  const hasText = !!(input.plaintext && input.plaintext.trim().length > 0);
  let plaintextField: string | undefined = hasText ? input.plaintext : undefined;
  let encryptedFields: Record<string, unknown> = {};
  if (hasText && input.plaintext) {
    try {
      const enc = await buildEncryptedSendPayload(input.conversationId, input.plaintext);
      encryptedFields = enc;
      plaintextField = undefined; // đã mã hoá → tuyệt đối không gửi kèm plaintext
    } catch {
      // Giữ nguyên plaintextField để server-encrypt (đường back-compat).
    }
  }

  const t0 = performance.now();
  const ack = (await socket
    .timeout(WS_SEND_TIMEOUT_MS)
    .emitWithAck('message:send', {
      conversationId: input.conversationId,
      // Caption rỗng → BỎ field (đừng gửi '') theo 04-messages.md.
      plaintext: plaintextField,
      ...encryptedFields,
      clientNonce,
      type: input.type ?? 'TEXT',
      // Bắt buộc với tin media; bỏ khi không có.
      attachmentIds: input.attachmentIds?.length ? input.attachmentIds : undefined,
      replyToMessageId: input.replyToMessageId,
      // Tag @user (group) — bỏ khi rỗng. Xem 04-messages.md.
      mentions: input.mentions?.length ? input.mentions : undefined,
      metadata: input.metadata,
      // Tin tự huỷ — giống REST. Bỏ field nếu không set (xem doc 15).
      selfDestructTtl: input.selfDestructTtl,
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
  // .catch(noop) ở nhánh cleanup để rejection của `next` không thành
  // unhandledRejection (nhánh chính `return next` mới là nơi mutation xử lý lỗi).
  next
    .finally(() => {
      if (sendQueues.get(convId) === next) sendQueues.delete(convId);
    })
    .catch(() => undefined);
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
      // Mốc giờ theo SERVER (bù lệch đồng hồ máy) → hai bên hiện cùng giờ gửi.
      const nowMs = serverNow();
      const now = new Date(nowMs).toISOString();

      const optimistic: Message = {
        id: tempId,
        conversationId: input.conversationId,
        senderId: currentUserId,
        type: input.type ?? 'TEXT',
        encryptionType: 'SERVER',
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
    },

    onError: (err, vars, ctx) => {
      if (!ctx) return;
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
      const meta = (msg.metadata ?? {}) as { clientNonce?: string };
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

type EditContext = { previous: MessagesCache | undefined };

export function useEditMessage() {
  const qc = useQueryClient();
  return useMutation<Message, Error, EditMessageInput, EditContext>({
    mutationFn: (vars) =>
      chatApi.editMessage(vars.conversationId, vars.messageId, vars.plaintext, vars.metadata),

    onMutate: (vars): EditContext => {
      const now = new Date().toISOString();
      const previous = patchMessageInCache(qc, vars.conversationId, vars.messageId, (m) => ({
        ...m,
        plaintext: vars.plaintext,
        contentPreview: vars.plaintext,
        // Gộp metadata mới (richText) — bỏ richText cũ nếu lần sửa này không còn định dạng.
        metadata: mergeEditMetadata(m.metadata, vars.metadata),
        isEdited: true,
        editedAt: now,
      }));
      return { previous };
    },

    onSuccess: (serverMsg, vars) => {
      // Đồng bộ lại theo bản chuẩn từ BE (nếu trả Message).
      if (serverMsg && typeof serverMsg === 'object' && 'id' in serverMsg) {
        patchMessageInCache(qc, vars.conversationId, vars.messageId, () => serverMsg);
      }
      debouncedInvalidate(qc, chatKeys.conversationLists());
    },

    onError: (err, vars, ctx) => {
      // Rollback về nội dung cũ (đồng hồ FE/BE lệch hoặc race) — xem doc 15.
      if (ctx?.previous) {
        qc.setQueryData(chatKeys.messages(vars.conversationId), ctx.previous);
      }
      const code = err instanceof ApiError ? err.code : '';
      if (code === 'MESSAGE_EDIT_WINDOW_EXPIRED') {
        toast.error('Đã quá 5 phút — không thể sửa tin này nữa');
      } else if (code === 'MESSAGE_ALREADY_DELETED') {
        // Tin đã bị gỡ ở phía khác → đồng bộ trạng thái thu hồi.
        patchMessageInCache(qc, vars.conversationId, vars.messageId, (m) => ({
          ...m,
          isDeleted: true,
          deletedFor: 'EVERYONE',
          plaintext: null,
          contentPreview: null,
          attachments: [],
        }));
        toast.error('Tin nhắn đã bị thu hồi');
      } else {
        toast.error(err.message || 'Sửa tin nhắn thất bại');
      }
    },
  });
}

export function useDeleteMessage() {
  const qc = useQueryClient();
  return useMutation<Message | void, Error, DeleteMessageInput, EditContext>({
    mutationFn: (vars) => chatApi.deleteMessage(vars.conversationId, vars.messageId),

    onMutate: (vars): EditContext => {
      const previous = patchMessageInCache(qc, vars.conversationId, vars.messageId, (m) => ({
        ...m,
        isDeleted: true,
        deletedFor: 'EVERYONE',
        plaintext: null,
        contentPreview: null,
        attachments: [],
      }));
      return { previous };
    },

    onSuccess: (serverMsg, vars) => {
      if (serverMsg && typeof serverMsg === 'object' && 'id' in serverMsg) {
        patchMessageInCache(qc, vars.conversationId, vars.messageId, () => serverMsg);
      }
      debouncedInvalidate(qc, chatKeys.conversationLists());
    },

    onError: (err, vars, ctx) => {
      // Gỡ idempotent ở BE → nếu đã gỡ (409) thì coi như thành công, giữ tombstone.
      if (err instanceof ApiError && err.code === 'MESSAGE_ALREADY_DELETED') return;
      if (ctx?.previous) {
        qc.setQueryData(chatKeys.messages(vars.conversationId), ctx.previous);
      }
      toast.error(err.message || 'Gỡ tin nhắn thất bại');
    },
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, scope }: { conversationId: string; scope?: 'ME' | 'BOTH' }) =>
      chatApi.deleteConversation(conversationId, scope),
    onSuccess: (_res, { conversationId }) => {
      qc.removeQueries({ queryKey: chatKeys.conversationDetail(conversationId) });
      qc.removeQueries({ queryKey: chatKeys.messages(conversationId) });
      debouncedInvalidate(qc, chatKeys.conversationLists());
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
    onMutate: async (vars) => {
      // Cancel refetch đang bay để không override optimistic (pattern TanStack Query).
      await qc.cancelQueries({ queryKey: chatKeys.conversationLists() });
      await qc.cancelQueries({ queryKey: chatKeys.conversationDetail(vars.conversationId) });
      // Xoá badge ngay lập tức ở cả list lẫn detail.
      qc.setQueriesData<import('@/features/chat/types').Conversation[]>(
        { queryKey: chatKeys.conversationLists() },
        (prev) =>
          prev
            ? prev.map((c) => (c.id === vars.conversationId ? { ...c, unreadCount: 0 } : c))
            : prev,
      );
      qc.setQueryData<import('@/features/chat/types').Conversation | undefined>(
        chatKeys.conversationDetail(vars.conversationId),
        (prev) => (prev ? { ...prev, unreadCount: 0 } : prev),
      );
    },
    onSettled: (_data, _err, vars) => {
      // API trả về (success hoặc error) → ghi đè lại unreadCount: 0 vào cache để chắc chắn.
      // KHÔNG refetch conversationLists sau đó: badge unread đã được set 0 trực tiếp; refetch
      // (server có thể chưa commit read) sẽ kéo về số cũ → "về 0 rồi nhảy lại số cũ".
      // Reconcile để sau qua refetchOnWindowFocus / reconnect (lúc đó read đã commit).
      qc.setQueriesData<import('@/features/chat/types').Conversation[]>(
        { queryKey: chatKeys.conversationLists() },
        (prev) =>
          prev
            ? prev.map((c) => (c.id === vars.conversationId ? { ...c, unreadCount: 0 } : c))
            : prev,
      );
      qc.setQueryData<import('@/features/chat/types').Conversation | undefined>(
        chatKeys.conversationDetail(vars.conversationId),
        (prev) => (prev ? { ...prev, unreadCount: 0 } : prev),
      );
    },
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; memberIds: string[] }) =>
      chatApi.createGroup(input),
    onSuccess: () => {
      debouncedInvalidate(qc, chatKeys.conversationLists());
    },
  });
}

/** Đặt/đổi biệt danh per-conversation cho 1 thành viên. BE trả Conversation đã cập nhật. */
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
    onSuccess: (conv, { conversationId }) => {
      qc.setQueryData(chatKeys.conversationDetail(conversationId), conv);
      debouncedInvalidate(qc, chatKeys.conversationLists());
    },
    onError: (e: Error) => toast.error(e.message || 'Đổi biệt danh thất bại'),
  });
}


/** Ghim / bỏ ghim hội thoại. Optimistic: set isPinned ngay để conv nổi lên đầu. */
export function useTogglePinConversation() {
  const qc = useQueryClient();
  return useMutation<
    import('@/features/chat/types').Conversation,
    Error,
    { conversationId: string; pinned: boolean },
    { previousLists: [readonly unknown[], unknown][] }
  >({
    mutationFn: ({ conversationId, pinned }) => chatApi.setPin(conversationId, pinned),

    onMutate: ({ conversationId, pinned }) => {
      const nowMaybe = new Date().toISOString();
      const previousLists = qc.getQueriesData<import('@/features/chat/types').Conversation[]>({
        queryKey: chatKeys.conversationLists(),
      });
      qc.setQueriesData<import('@/features/chat/types').Conversation[]>(
        { queryKey: chatKeys.conversationLists() },
        (prev) =>
          prev
            ? prev.map((c) =>
                c.id === conversationId
                  ? { ...c, isPinned: pinned, pinnedAt: pinned ? nowMaybe : null }
                  : c,
              )
            : prev,
      );
      qc.setQueryData<import('@/features/chat/types').Conversation | undefined>(
        chatKeys.conversationDetail(conversationId),
        (prev) => (prev ? { ...prev, isPinned: pinned, pinnedAt: pinned ? nowMaybe : null } : prev),
      );
      return { previousLists };
    },

    onError: (_err, _vars, ctx) => {
      ctx?.previousLists.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error('Cập nhật ghim thất bại');
    },

    onSuccess: (conv, { conversationId }) => {
      qc.setQueryData(chatKeys.conversationDetail(conversationId), conv);
      debouncedInvalidate(qc, chatKeys.conversationLists());
    },
  });
}

/** Mute / unmute thông báo (per-user). Optimistic set isMuted ngay; reconcile bằng response normalize. */
export function useMuteConversation() {
  const qc = useQueryClient();
  type Conv = import('@/features/chat/types').Conversation;
  return useMutation<
    Conv,
    Error,
    { conversationId: string; isMuted: boolean; mutedUntil?: string | null },
    { previousLists: [readonly unknown[], unknown][] }
  >({
    mutationFn: ({ conversationId, isMuted, mutedUntil }) =>
      chatApi.setMute(conversationId, { isMuted, mutedUntil }),

    onMutate: ({ conversationId, isMuted, mutedUntil }) => {
      const nextUntil = isMuted ? mutedUntil ?? null : null;
      const patch = (c: Conv): Conv =>
        c.id === conversationId ? { ...c, isMuted, mutedUntil: nextUntil } : c;
      const previousLists = qc.getQueriesData<Conv[]>({ queryKey: chatKeys.conversationLists() });
      qc.setQueriesData<Conv[]>(
        { queryKey: chatKeys.conversationLists() },
        (prev) => (prev ? prev.map(patch) : prev),
      );
      qc.setQueryData<Conv | undefined>(
        chatKeys.conversationDetail(conversationId),
        (prev) => (prev ? { ...prev, isMuted, mutedUntil: nextUntil } : prev),
      );
      return { previousLists };
    },

    onError: (_err, _vars, ctx) => {
      ctx?.previousLists.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error('Cập nhật thông báo thất bại');
    },

    onSuccess: (conv, { conversationId }) => {
      qc.setQueryData(chatKeys.conversationDetail(conversationId), conv);
      qc.setQueriesData<Conv[]>(
        { queryKey: chatKeys.conversationLists() },
        (prev) => (prev ? prev.map((c) => (c.id === conversationId ? conv : c)) : prev),
      );
    },
  });
}

/** Thêm thành viên vào nhóm (OWNER/ADMIN). BE trả Conversation đã cập nhật members. */
export function useAddMembers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, userIds }: { conversationId: string; userIds: string[] }) =>
      chatApi.addMembers(conversationId, userIds),
    onSuccess: (conv, { conversationId }) => {
      qc.setQueryData(chatKeys.conversationDetail(conversationId), conv);
      debouncedInvalidate(qc, chatKeys.conversationLists());
      toast.success('Đã thêm thành viên');
    },
    onError: (e: Error) => toast.error(e.message || 'Thêm thành viên thất bại'),
  });
}

/** Kick 1 thành viên khỏi nhóm (OWNER/ADMIN/MOD, chỉ role thấp hơn). Trả { ok: true }. */
export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, userId }: { conversationId: string; userId: string }) =>
      chatApi.removeMember(conversationId, userId),
    onSuccess: (_res, { conversationId }) => {
      // BE chỉ trả { ok: true } → refetch detail để lấy members[] mới.
      qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(conversationId) });
      debouncedInvalidate(qc, chatKeys.conversationLists());
      toast.success('Đã xoá thành viên');
    },
    onError: (e: Error) => toast.error(e.message || 'Xoá thành viên thất bại'),
  });
}

/** Tự rời nhóm. OWNER không rời được (BE chặn → toast lỗi). */
export function useLeaveConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => chatApi.leaveConversation(conversationId),
    onSuccess: (_res, conversationId) => {
      qc.removeQueries({ queryKey: chatKeys.conversationDetail(conversationId) });
      qc.removeQueries({ queryKey: chatKeys.messages(conversationId) });
      debouncedInvalidate(qc, chatKeys.conversationLists());
    },
    onError: (e: Error) => toast.error(e.message || 'Rời nhóm thất bại'),
  });
}

/** Duyệt yêu cầu vào nhóm (OWNER/ADMIN/MOD) → thêm người gửi làm MEMBER. */
export function useAcceptJoinRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, requestId }: { conversationId: string; requestId: string }) =>
      chatApi.acceptJoinRequest(conversationId, requestId),
    onSuccess: (_res, { conversationId }) => {
      qc.invalidateQueries({ queryKey: chatKeys.joinRequests(conversationId) });
      qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(conversationId) });
      debouncedInvalidate(qc, chatKeys.conversationLists());
      toast.success('Đã duyệt yêu cầu vào nhóm');
    },
    onError: (e: Error) => toast.error(e.message || 'Duyệt yêu cầu thất bại'),
  });
}

/** Từ chối yêu cầu vào nhóm (OWNER/ADMIN/MOD). reason optional. */
export function useRejectJoinRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      conversationId,
      requestId,
      reason,
    }: {
      conversationId: string;
      requestId: string;
      reason?: string;
    }) => chatApi.rejectJoinRequest(conversationId, requestId, reason),
    onSuccess: (_res, { conversationId }) => {
      qc.invalidateQueries({ queryKey: chatKeys.joinRequests(conversationId) });
      toast.success('Đã từ chối yêu cầu');
    },
    onError: (e: Error) => toast.error(e.message || 'Từ chối yêu cầu thất bại'),
  });
}

export function useLockConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, password }: { conversationId: string; password: string }) =>
      chatApi.lockConversation(conversationId, password),
    onSuccess: (conv, { conversationId }) => {
      // Xoá khỏi normal list, thêm vào locked list
      qc.setQueriesData<import('@/features/chat/types').Conversation[]>(
        { queryKey: chatKeys.conversationLists() },
        (prev) => prev?.filter((c) => c.id !== conversationId) ?? prev,
      );
      qc.setQueryData<import('@/features/chat/types').Conversation[]>(
        chatKeys.lockedConversations(),
        (prev) => {
          const list = prev ?? [];
          if (list.some((c) => c.id === conv.id)) return list;
          return [conv, ...list];
        },
      );
      qc.setQueryData(chatKeys.conversationDetail(conversationId), conv);
      toast.success('Đã khoá hội thoại');
    },
    onError: (e: Error) => toast.error(e.message || 'Khoá hội thoại thất bại'),
  });
}

export function useRemoveLock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, password }: { conversationId: string; password: string }) =>
      chatApi.removeLock(conversationId, password),
    onSuccess: (_res, { conversationId }) => {
      // Xoá khỏi locked list, invalidate detail + lists để refetch
      qc.setQueryData<import('@/features/chat/types').Conversation[]>(
        chatKeys.lockedConversations(),
        (prev) => prev?.filter((c) => c.id !== conversationId) ?? prev,
      );
      qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(conversationId) });
      debouncedInvalidate(qc, chatKeys.conversationLists());
      toast.success('Đã tắt khoá hội thoại');
    },
    onError: (e: Error) => {
      const code = e instanceof ApiError ? e.code : '';
      if (code === 'CONVERSATION_LOCK_WRONG_PASSWORD') {
        toast.error('Sai mật khẩu xác nhận');
      } else if (code === 'CONVERSATION_NOT_LOCKED') {
        // Race: đã unlock ở thiết bị khác — sync cache
        qc.invalidateQueries({ queryKey: chatKeys.conversationLists() });
      } else {
        toast.error(e.message || 'Tắt khoá thất bại');
      }
    },
  });
}

/**
 * Đổi mật khẩu khoá hội thoại: BẮT BUỘC nhập đúng mật khẩu hiện tại (verify) rồi mới
 * đặt mật khẩu mới. BE PUT /lock không tự kiểm mật khẩu cũ nên FE chặn ở đây.
 */
export function useChangeLockPassword() {
  const qc = useQueryClient();
  return useMutation<
    import('@/features/chat/types').Conversation,
    Error,
    { conversationId: string; currentPassword: string; newPassword: string }
  >({
    mutationFn: async ({ conversationId, currentPassword, newPassword }) => {
      // verifyLock ném lỗi nếu mật khẩu hiện tại sai → không đổi sang mật khẩu mới.
      await chatApi.verifyLock(conversationId, currentPassword);
      return chatApi.lockConversation(conversationId, newPassword);
    },
    onSuccess: (conv, { conversationId }) => {
      qc.setQueryData(chatKeys.conversationDetail(conversationId), conv);
      toast.success('Đã đổi mật khẩu hội thoại');
    },
    onError: (e: Error) => {
      const code = e instanceof ApiError ? e.code : '';
      if (code === 'CONVERSATION_LOCK_WRONG_PASSWORD') {
        toast.error('Mật khẩu hiện tại không đúng');
      } else if (code === 'CONVERSATION_NOT_LOCKED') {
        qc.invalidateQueries({ queryKey: chatKeys.conversationLists() });
      } else {
        toast.error(e.message || 'Đổi mật khẩu thất bại');
      }
    },
  });
}

// ─── Cài đặt nhóm (xem 28-group-settings.md) ─────────────────────────────────

/** Đổi tên/mô tả/công khai nhóm. BE trả Conversation đầy đủ đã cập nhật. */
export function useUpdateConversation() {
  const qc = useQueryClient();
  return useMutation<
    Conversation,
    Error,
    { conversationId: string; input: UpdateConversationInput }
  >({
    mutationFn: ({ conversationId, input }) =>
      chatApi.updateConversation(conversationId, input),
    onSuccess: (conv, { conversationId }) => {
      qc.setQueryData(chatKeys.conversationDetail(conversationId), conv);
      debouncedInvalidate(qc, chatKeys.conversationLists());
      toast.success('Đã cập nhật thông tin nhóm');
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Cập nhật nhóm thất bại')),
  });
}

/** Cập nhật quyền hạn nhóm (joinByLink, whoCanSend, …). BE trả Conversation đầy đủ. */
export function useUpdateGroupSettings() {
  const qc = useQueryClient();
  return useMutation<
    Conversation,
    Error,
    { conversationId: string; settings: Partial<GroupSettings> }
  >({
    mutationFn: ({ conversationId, settings }) =>
      chatApi.updateSettings(conversationId, settings),
    onSuccess: (conv, { conversationId }) => {
      qc.setQueryData(chatKeys.conversationDetail(conversationId), conv);
      debouncedInvalidate(qc, chatKeys.conversationLists());
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Cập nhật quyền nhóm thất bại')),
  });
}

/** Chặn (ban) 1 thành viên. BE phát WS member_removed (reason KICKED) → refetch detail. */
export function useBanMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, userId }: { conversationId: string; userId: string }) =>
      chatApi.banMember(conversationId, userId),
    onSuccess: (_res, { conversationId }) => {
      qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(conversationId) });
      qc.invalidateQueries({ queryKey: chatKeys.bannedMembers(conversationId) });
      debouncedInvalidate(qc, chatKeys.conversationLists());
      toast.success('Đã chặn thành viên');
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Chặn thành viên thất bại')),
  });
}

/** Bỏ chặn 1 thành viên. */
export function useUnbanMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, userId }: { conversationId: string; userId: string }) =>
      chatApi.unbanMember(conversationId, userId),
    onSuccess: (_res, { conversationId }) => {
      qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(conversationId) });
      qc.invalidateQueries({ queryKey: chatKeys.bannedMembers(conversationId) });
      toast.success('Đã bỏ chặn thành viên');
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Bỏ chặn thất bại')),
  });
}

/** Cấp/gỡ quyền phó nhóm (ADMIN ↔ MEMBER). Chỉ OWNER. Refetch detail để cập nhật role. */
export function useSetMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, userId, role }: {
      conversationId: string; userId: string; role: 'ADMIN' | 'MEMBER';
    }) => chatApi.setMemberRole(conversationId, userId, role),
    onSuccess: (_res, { conversationId, role }) => {
      qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(conversationId) });
      toast.success(role === 'ADMIN' ? 'Đã cấp quyền phó nhóm' : 'Đã gỡ quyền phó nhóm');
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Cập nhật quyền thất bại')),
  });
}

/** Nhượng quyền trưởng nhóm. Chỉ OWNER. Refetch detail + list (role mình đổi). */
export function useTransferOwnership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, userId }: { conversationId: string; userId: string }) =>
      chatApi.transferOwnership(conversationId, userId),
    onSuccess: (_res, { conversationId }) => {
      qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(conversationId) });
      debouncedInvalidate(qc, chatKeys.conversationLists());
      toast.success('Đã nhượng quyền trưởng nhóm');
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Nhượng quyền thất bại')),
  });
}

// ─── Ghim tin nhắn (xem 29-pinned-messages.md) ───────────────────────────────

/** Ghim 1 tin. Invalidate danh sách ghim + detail (pinnedCount). */
export function usePinMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, messageId }: { conversationId: string; messageId: string }) =>
      chatApi.pinMessage(conversationId, messageId),
    onSuccess: (_msg, { conversationId }) => {
      qc.invalidateQueries({ queryKey: chatKeys.pinnedMessages(conversationId) });
      qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(conversationId) });
      toast.success('Đã ghim tin nhắn');
    },
    onError: (e) => {
      const code = e instanceof ApiError ? e.code : '';
      // Đã ghim ở nơi khác → coi như xong, chỉ đồng bộ danh sách.
      if (code === 'MESSAGE_ALREADY_PINNED') return;
      toast.error(getErrorMessage(e, 'Ghim tin nhắn thất bại'));
    },
  });
}

/** Bỏ ghim 1 tin. */
export function useUnpinMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, messageId }: { conversationId: string; messageId: string }) =>
      chatApi.unpinMessage(conversationId, messageId),
    onSuccess: (_res, { conversationId }) => {
      qc.invalidateQueries({ queryKey: chatKeys.pinnedMessages(conversationId) });
      qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(conversationId) });
    },
    onError: (e) => {
      const code = e instanceof ApiError ? e.code : '';
      if (code === 'MESSAGE_NOT_PINNED') return;
      toast.error(getErrorMessage(e, 'Bỏ ghim thất bại'));
    },
  });
}

export function useVerifyLock() {
  const convLockStore = useConvLockStore();
  return useMutation({
    mutationFn: ({ conversationId, password }: { conversationId: string; password: string }) =>
      chatApi.verifyLock(conversationId, password),
    onSuccess: (_res, { conversationId }) => {
      convLockStore.markUnlocked(conversationId);
    },
    onError: (e: Error) => {
      const code = e instanceof ApiError ? e.code : '';
      if (code === 'CONVERSATION_LOCK_WRONG_PASSWORD') {
        toast.error('Sai mật khẩu, thử lại');
      } else if (code === 'CONVERSATION_NOT_LOCKED') {
        // Race: conv vừa unlock ở thiết bị khác — không cần hiện lỗi
      } else {
        toast.error(e.message || 'Xác thực thất bại');
      }
    },
  });
}

/** Tạo (hoặc mở) hội thoại DIRECT với 1 user rồi chuyển sang hội thoại đó. */
export function useOpenDirectConversation() {
  const qc = useQueryClient();
  const { setSelected } = useSelectedConversation();
  return useMutation({
    mutationFn: (userId: string) => chatApi.createDirect(userId),
    onSuccess: (conv) => {
      qc.invalidateQueries({ queryKey: chatKeys.conversationLists() });
      setSelected(conv.id);
    },
    onError: (e: Error) => toast.error(e.message || 'Không mở được cuộc trò chuyện'),
  });
}

export function useUpdateBackground() {
  const qc = useQueryClient();
  return useMutation<
    { background: string | null },
    Error,
    { conversationId: string; background: string | null },
    { prev: Conversation | undefined }
  >({
    mutationFn: ({ conversationId, background }) =>
      chatApi.updateBackground(conversationId, background),
    onMutate: async ({ conversationId, background }) => {
      await qc.cancelQueries({ queryKey: chatKeys.conversationDetail(conversationId) });
      const prev = qc.getQueryData<Conversation>(chatKeys.conversationDetail(conversationId));
      qc.setQueryData<Conversation>(chatKeys.conversationDetail(conversationId), (old) =>
        old ? { ...old, background } : old,
      );
      return { prev };
    },
    onError: (_e, { conversationId }, ctx) => {
      if (ctx?.prev) qc.setQueryData(chatKeys.conversationDetail(conversationId), ctx.prev);
      toast.error('Đổi nền thất bại');
    },
    onSuccess: (_data, { conversationId }) => {
      debouncedInvalidate(qc, chatKeys.conversationLists());
      qc.invalidateQueries({ queryKey: chatKeys.conversationDetail(conversationId) });
    },
  });
}
