'use client';

import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { chatApi } from '@/services/chat.api';
import { chatKeys } from '@/services/keys';
import { useAuthStore } from '@/features/auth';
import type { Message, MessageReaction, MessagesPage } from '@/features/chat/types';

type MessagesCache = InfiniteData<MessagesPage, string | null>;
type ToggleVars = { messageId: string; emoji: string; active: boolean };

/** Tính danh sách reactions mới sau khi toggle 1 emoji của user hiện tại (immutable). */
function applyToggle(
  list: MessageReaction[] | undefined,
  emoji: string,
  meId: string,
  active: boolean,
): MessageReaction[] {
  const reactions = (list ?? []).map((r) => ({ ...r, userIds: [...r.userIds] }));
  const idx = reactions.findIndex((r) => r.emoji === emoji);

  if (active) {
    // Đang có → bỏ.
    if (idx === -1) return reactions;
    const userIds = reactions[idx].userIds.filter((u) => u !== meId);
    if (userIds.length === 0) return reactions.filter((_, i) => i !== idx);
    reactions[idx] = { ...reactions[idx], userIds, count: userIds.length, reactedByMe: false };
    return reactions;
  }

  // Chưa có → thêm.
  if (idx === -1) {
    return [...reactions, { emoji, userIds: [meId], count: 1, reactedByMe: true }];
  }
  if (reactions[idx].userIds.includes(meId)) return reactions;
  const userIds = [...reactions[idx].userIds, meId];
  reactions[idx] = { ...reactions[idx], userIds, count: userIds.length, reactedByMe: true };
  return reactions;
}

function patchReactions(
  qc: ReturnType<typeof useQueryClient>,
  conversationId: string,
  messageId: string,
  next: (m: Message) => MessageReaction[] | undefined,
): MessagesCache | undefined {
  const key = chatKeys.messages(conversationId);
  const previous = qc.getQueryData<MessagesCache>(key);
  qc.setQueryData<MessagesCache>(key, (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((p) => ({
        ...p,
        items: p.items.map((m) => (m.id === messageId ? { ...m, reactions: next(m) } : m)),
      })),
    };
  });
  return previous;
}

/**
 * Toggle 1 emoji reaction trên tin nhắn (optimistic + reconcile theo Message BE trả về).
 * Chỉ chạy khi REACTIONS_ENABLED (gate ở UI) — endpoint còn chờ BE chốt.
 */
export function useToggleReaction(conversationId: string) {
  const qc = useQueryClient();
  const meId = useAuthStore((s) => s.user?.id ?? '');

  return useMutation<Message, Error, ToggleVars, { previous?: MessagesCache }>({
    mutationFn: ({ messageId, emoji, active }) =>
      active
        ? chatApi.unreactFromMessage(conversationId, messageId, emoji)
        : chatApi.reactToMessage(conversationId, messageId, emoji),

    onMutate: ({ messageId, emoji, active }) => {
      const previous = patchReactions(qc, conversationId, messageId, (m) =>
        applyToggle(m.reactions, emoji, meId, active),
      );
      return { previous };
    },

    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(chatKeys.messages(conversationId), ctx.previous);
      toast.error('Không thể cập nhật cảm xúc');
    },

    onSuccess: (serverMsg, { messageId }) => {
      if (serverMsg && typeof serverMsg === 'object' && 'id' in serverMsg) {
        patchReactions(qc, conversationId, messageId, () => serverMsg.reactions);
      }
    },
  });
}
