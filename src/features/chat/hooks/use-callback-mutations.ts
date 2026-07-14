'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { chatApi } from '@/services/chat.api';
import { getErrorMessage } from '@/lib/api/error-message';

export function useCreateCallback() {
  return useMutation({
    mutationFn: (input: {
      conversationId: string;
      messageId: string;
      callbackData: string;
      clientNonce?: string;
    }) =>
      chatApi.createCallback(input.conversationId, input.messageId, {
        callbackData: input.callbackData,
        clientNonce: input.clientNonce,
      }),
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Không gửi được, thử lại sau'));
    },
  });
}
