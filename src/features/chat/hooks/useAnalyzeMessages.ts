'use client';

import { useMutation } from '@tanstack/react-query';
import { aiApi } from '@/services/ai.api';
import { messageApi } from '@/services/chat-message.api';

export type AnalyzeMessagesVariables = {
  projectId: string;
  conversationId: string;
  messageIds: string[];
  instruction?: string;
};

export function useAnalyzeMessages() {
  return useMutation({
    mutationFn: async ({
      projectId,
      conversationId,
      messageIds,
      instruction,
    }: AnalyzeMessagesVariables) => {
      const uniqueIds = [...new Set(messageIds)];
      if (uniqueIds.length === 0) throw new Error('Chưa chọn tin nhắn để phân tích.');

      const messages = await messageApi.resolveByIds(conversationId, uniqueIds);
      if (messages.length !== uniqueIds.length) {
        throw new Error('Một số tin nhắn không còn khả dụng. Hãy tải lại cuộc trò chuyện.');
      }

      return aiApi.analyze({
        projectId,
        conversationId,
        messages,
        ...(instruction?.trim() ? { instruction: instruction.trim() } : {}),
      });
    },
  });
}
