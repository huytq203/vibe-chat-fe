import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';
import { taskKeys } from '../services/keys';
import { applyTagAttached, applyTagDetached } from '../lib/board-cache';
import { seedFromDetail } from '../lib/detail-seed';
import { markLocal } from '../lib/local-mutations';
import type { Board, Tag } from '../types';

function taskTagsKey(projectId: string, taskId: string) {
  return ['tasks', projectId, taskId, 'tags'] as const;
}

function tagMutationKey(projectId: string, taskId: string) {
  return ['tasks', projectId, taskId, 'tags', 'mutate'] as const;
}

/**
 * Chỉ refetch khi KHÔNG còn mutation nhãn nào đang chạy. Khi click nhiều nhãn
 * liên tiếp, nếu mỗi lần đều invalidate → refetch giữa chừng (server chưa commit
 * đủ) sẽ ghi đè optimistic → mất nhãn. Guard này đảm bảo chỉ lần cuối mới refetch.
 */
function settleTags(qc: QueryClient, projectId: string, taskId: string) {
  if (qc.isMutating({ mutationKey: tagMutationKey(projectId, taskId) }) <= 1) {
    void qc.invalidateQueries({ queryKey: taskTagsKey(projectId, taskId) });
  }
}

export function useTaskTags(projectId: string, taskId: string | null) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['tasks', projectId, taskId, 'tags'],
    queryFn: () => tasksApi.listTaskTags(projectId, taskId!),
    enabled: !!projectId && !!taskId,
    ...(taskId ? seedFromDetail(qc, projectId, taskId, (detail) => detail.tags) : {}),
  });
}

export function useProjectTags(projectId: string) {
  return useQuery({
    queryKey: ['tasks', projectId, 'tags'],
    queryFn: () => tasksApi.listProjectTags(projectId),
    enabled: !!projectId,
  });
}

export function useAttachTag(projectId: string, taskId: string) {
  const qc = useQueryClient();
  const key = taskTagsKey(projectId, taskId);
  return useMutation({
    mutationKey: tagMutationKey(projectId, taskId),
    // Nhận cả object Tag để optimistic hiển thị ngay trong modal.
    mutationFn: (tag: Tag) => {
      markLocal(taskId, 'task:tag-attached');
      return tasksApi.attachTag(taskId, tag.id);
    },
    onMutate: async (tag) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Tag[]>(key);
      qc.setQueryData<Tag[]>(key, (old = []) =>
        old.some((t) => t.id === tag.id) ? old : [...old, tag],
      );
      return { prev };
    },
    onError: (_e, _tag, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSuccess: (_result, tag) => {
      qc.setQueryData<Board>(taskKeys.board(projectId), (board) =>
        board
          ? (applyTagAttached(board, {
              taskId,
              tag: { id: tag.id, name: tag.name, color: tag.color },
            }) ?? board)
          : board,
      );
    },
    onSettled: () => settleTags(qc, projectId, taskId),
  });
}

export function useDetachTag(projectId: string, taskId: string) {
  const qc = useQueryClient();
  const key = taskTagsKey(projectId, taskId);
  return useMutation({
    mutationKey: tagMutationKey(projectId, taskId),
    mutationFn: (tagId: string) => {
      markLocal(taskId, 'task:tag-detached');
      return tasksApi.detachTag(taskId, tagId);
    },
    onMutate: async (tagId) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Tag[]>(key);
      qc.setQueryData<Tag[]>(key, (old = []) => old.filter((t) => t.id !== tagId));
      return { prev };
    },
    onError: (_e, _tagId, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSuccess: (_result, tagId) => {
      qc.setQueryData<Board>(taskKeys.board(projectId), (board) =>
        board ? (applyTagDetached(board, { taskId, tagId }) ?? board) : board,
      );
    },
    onSettled: () => settleTags(qc, projectId, taskId),
  });
}
