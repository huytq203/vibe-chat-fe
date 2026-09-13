import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { aiConversationKeys } from '@/features/ai/lib/ai-conversation-keys';
import {
  aiConversationsApi,
  type AiConversationSummary,
} from '@/services/ai-conversations.api';

/**
 * Xoá hội thoại có chống bấm đúp: id đang xoá bị khoá tới khi API trả về,
 * danh sách được gỡ ngay (optimistic) và khôi phục nếu API lỗi.
 */
/** Gỡ áp dụng cho mọi danh sách đã cache (mọi origin), nên không cần tham số. */
export function useDeleteAiConversation() {
  const queryClient = useQueryClient();
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<string>>(() => new Set());

  const isDeleting = useCallback((id: string) => deletingIds.has(id), [deletingIds]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    if (deletingIds.has(id)) return false;
    setDeletingIds((previous) => new Set(previous).add(id));
    // Danh sách được cache theo origin ('NOTES', 'TASKS'… hoặc 'all' khi không lọc) —
    // phải gỡ khỏi MỌI danh sách đang có, không chỉ danh sách của origin hiện tại.
    const listPrefix = [...aiConversationKeys.all, 'list'] as const;
    const snapshots = queryClient.getQueriesData<AiConversationSummary[]>({ queryKey: listPrefix });
    queryClient.setQueriesData<AiConversationSummary[]>({ queryKey: listPrefix }, (current) =>
      current?.filter((item) => item.id !== id),
    );
    try {
      await aiConversationsApi.remove(id);
      queryClient.removeQueries({ queryKey: aiConversationKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: listPrefix });
      return true;
    } catch (error) {
      for (const [key, data] of snapshots) queryClient.setQueryData(key, data);
      throw error;
    } finally {
      setDeletingIds((previous) => {
        const next = new Set(previous);
        next.delete(id);
        return next;
      });
    }
  }, [deletingIds, queryClient]);

  return { remove, isDeleting };
}
