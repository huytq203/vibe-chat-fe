'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { chatApi } from '@/services/chat.api';
import { getErrorMessage } from '@/lib/api/error-message';
import { botKeys } from '@/services/keys';

export function useCreateCallback() {
  const queryClient = useQueryClient();
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
    onSuccess: (_data, input) => {
      if (input.callbackData.startsWith('bf:transfer:')) {
        void queryClient.invalidateQueries({ queryKey: botKeys.all });
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Không gửi được, thử lại sau'));
    },
  });
}
