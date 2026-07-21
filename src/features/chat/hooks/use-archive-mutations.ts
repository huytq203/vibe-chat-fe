'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { chatApi } from '@/services/chat.api';
import { chatKeys } from '@/services/keys';

export function useArchiveConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, archived }: { conversationId: string; archived: boolean }) =>
      chatApi.setArchived(conversationId, archived),
    onSuccess: (_conversation, variables) => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.conversationLists() });
      toast.success(variables.archived ? 'Đã chuyển vào Kho lưu trữ' : 'Đã đưa về danh sách chính');
    },
    onError: (error: Error) => toast.error(error.message || 'Không thể cập nhật Kho lưu trữ'),
  });
}
