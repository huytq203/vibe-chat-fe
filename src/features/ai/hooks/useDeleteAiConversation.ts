import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { aiConversationKeys } from '@/features/ai/lib/ai-conversation-keys';
import {
  aiConversationsApi,
  type AiConversationOrigin,
  type AiConversationSummary,
} from '@/services/ai-conversations.api';

/**
 * Xoá hội thoại có chống bấm đúp: id đang xoá bị khoá tới khi API trả về,
 * danh sách được gỡ ngay (optimistic) và khôi phục nếu API lỗi.
 */
export function useDeleteAiConversation(origin: AiConversationOrigin) {
  const queryClient = useQueryClient();
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<string>>(() => new Set());

  const isDeleting = useCallback((id: string) => deletingIds.has(id), [deletingIds]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    if (deletingIds.has(id)) return false;
    setDeletingIds((previous) => new Set(previous).add(id));
    const listKey = aiConversationKeys.list(origin);
    const snapshot = queryClient.getQueryData<AiConversationSummary[]>(listKey);
    queryClient.setQueryData<AiConversationSummary[]>(listKey, (current) =>
      current?.filter((item) => item.id !== id),
    );
    try {
      await aiConversationsApi.remove(id);
      queryClient.removeQueries({ queryKey: aiConversationKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: listKey });
      return true;
    } catch (error) {
      queryClient.setQueryData(listKey, snapshot);
      throw error;
    } finally {
      setDeletingIds((previous) => {
        const next = new Set(previous);
        next.delete(id);
        return next;
      });
    }
  }, [deletingIds, origin, queryClient]);

  return { remove, isDeleting };
}
