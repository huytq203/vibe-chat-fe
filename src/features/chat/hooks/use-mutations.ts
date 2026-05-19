'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '@/services/chat.api';
import { chatKeys } from '@/services/keys';
import type { SendMessageInput } from '../types';

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SendMessageInput) => chatApi.sendMessage(input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: chatKeys.messages(vars.conversationId) });
      qc.invalidateQueries({ queryKey: chatKeys.conversationLists() });
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
