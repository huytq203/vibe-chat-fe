'use client';

import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { chatApi } from '@/services/chat.api';
import { chatKeys } from '@/services/keys';
import { ApiError, apiAuth } from '@/lib/api/client';
import { debouncedInvalidate } from '@/lib/query/debounced-invalidate';
import { getSocket } from '@/lib/ws/socket';
import { serverNow } from '@/lib/time/server-clock';
import { useAuthStore } from '@/features/auth';
import type {
  DeleteMessageInput,
  EditMessageInput,
  Message,
  MessagesPage,
  SendMessageInput,
} from '../types';

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
  const t0 = performance.now();
  const ack = (await socket
    .timeout(WS_SEND_TIMEOUT_MS)
    .emitWithAck('message:send', {
      conversationId: input.conversationId,
      // Caption rỗng → BỎ field (đừng gửi '') theo 04-messages.md.
      plaintext: input.plaintext ? input.plaintext : undefined,
      clientNonce,
      type: input.type ?? 'TEXT',
      // Bắt buộc với tin media; bỏ khi không có.
      attachmentIds: input.attachmentIds?.length ? input.attachmentIds : undefined,
      replyToMessageId: input.replyToMessageId,
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
        encrypted: null,
        attachments: input.optimisticAttachment ? [input.optimisticAttachment] : [],
        contentPreview: input.plaintext ?? null,
        metadata: {
          ...(input.metadata ?? {}),
          ...(input.previewUrl ? { previewUrl: input.previewUrl } : {}),
          optimistic: true,
          clientNonce,
        },
        replyToMessageId: input.replyToMessageId ?? null,
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
      chatApi.editMessage(vars.conversationId, vars.messageId, vars.plaintext),

    onMutate: (vars): EditContext => {
      const now = new Date().toISOString();
      const previous = patchMessageInCache(qc, vars.conversationId, vars.messageId, (m) => ({
        ...m,
        plaintext: vars.plaintext,
        contentPreview: vars.plaintext,
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
    mutationFn: (conversationId: string) => chatApi.deleteConversation(conversationId),
    onSuccess: (_res, conversationId) => {
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
      debouncedInvalidate(qc, chatKeys.conversationLists());
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

/** Ghim / bỏ ghim hội thoại. Optimistic: set isPinned ngay để conv nổi lên đầu. */
export function useTogglePinConversation() {
  const qc = useQueryClient();
  return useMutation<
    import('../types').Conversation,
    Error,
    { conversationId: string; pinned: boolean },
    { previousLists: [readonly unknown[], unknown][] }
  >({
    mutationFn: ({ conversationId, pinned }) => chatApi.setPin(conversationId, pinned),

    onMutate: ({ conversationId, pinned }) => {
      const nowMaybe = new Date().toISOString();
      const previousLists = qc.getQueriesData<import('../types').Conversation[]>({
        queryKey: chatKeys.conversationLists(),
      });
      qc.setQueriesData<import('../types').Conversation[]>(
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
      qc.setQueryData<import('../types').Conversation | undefined>(
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
      toast.success('Đã rời nhóm');
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
