'use client';

import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { chatApi } from '@/services/chat.api';
import { chatKeys } from '@/services/keys';
import { computeOptimistic } from './reactions-logic';
import type {
  Message,
  MessagesPage,
  ReactionState,
  ReactionType,
} from '@/features/chat/types';

type MessagesCache = InfiniteData<MessagesPage, string | null>;
type ToggleVars = { messageId: string; type: ReactionType; current: ReactionType | null };

/** Cập nhật reactions/myReaction của 1 message trong cache infinite (immutable). */
function patchMessage(
  qc: ReturnType<typeof useQueryClient>,
  conversationId: string,
  messageId: string,
  patch: Pick<Message, 'reactions' | 'myReaction'>,
): MessagesCache | undefined {
  const key = chatKeys.messages(conversationId);
  const previous = qc.getQueryData<MessagesCache>(key);
  qc.setQueryData<MessagesCache>(key, (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((p) => ({
        ...p,
        items: p.items.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
      })),
    };
  });
  return previous;
}

/** Toggle cảm xúc trên tin nhắn (optimistic + reconcile theo ReactionState BE trả). */
export function useToggleReaction(conversationId: string) {
  const qc = useQueryClient();

  return useMutation<ReactionState, Error, ToggleVars, { previous?: MessagesCache }>({
    mutationFn: ({ messageId, type, current }) =>
      current === type
        ? chatApi.removeReaction(conversationId, messageId)
        : chatApi.setReaction(conversationId, messageId, type),

    onMutate: ({ messageId, type, current }) => {
      const key = chatKeys.messages(conversationId);
      const previous = qc.getQueryData<MessagesCache>(key);
      const msg = previous?.pages.flatMap((p) => p.items).find((m) => m.id === messageId);
      patchMessage(qc, conversationId, messageId, computeOptimistic(msg?.reactions, current, type));
      return { previous };
    },

    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(chatKeys.messages(conversationId), ctx.previous);
      toast.error('Không thể cập nhật cảm xúc');
    },

    onSuccess: (state, { messageId }) => {
      patchMessage(qc, conversationId, messageId, {
        reactions: state.reactions,
        myReaction: state.myReaction,
      });
    },
  });
}
