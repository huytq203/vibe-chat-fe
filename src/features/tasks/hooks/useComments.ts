import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';
import { taskKeys } from '../services/keys';
import { upsertById, removeById } from '../lib/list-cache';
import { bumpTaskCount } from '../lib/board-cache';
import type { Board, Comment } from '../types';

const commentsKey = (projectId: string, taskId: string | null) =>
  ['tasks', projectId, taskId, 'comments'] as const;

const byCreatedAt = (a: Comment, b: Comment): number => a.createdAt.localeCompare(b.createdAt);

/** Cập nhật commentCount trên card board tại chỗ — không refetch cả board */
function bumpBoardCommentCount(
  qc: QueryClient,
  projectId: string,
  taskId: string,
  delta: number,
): void {
  qc.setQueryData<Board>(taskKeys.board(projectId), (old) =>
    old ? (bumpTaskCount(old, taskId, 'commentCount', delta) ?? old) : old,
  );
}

export function useComments(projectId: string, taskId: string | null) {
  return useQuery({
    queryKey: commentsKey(projectId, taskId),
    queryFn: () => tasksApi.listComments(projectId, taskId!),
    enabled: !!projectId && !!taskId,
  });
}

export function useCreateComment(projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { content: string; displayName: string; avatarUrl?: string | null }) =>
      tasksApi.createComment(projectId, taskId, input),
    // Write-through: comment hiện ngay từ response, không chờ refetch.
    // Event realtime tới sau cũng vô hại (upsert dedupe theo id).
    onSuccess: (created) => {
      qc.setQueryData<Comment[]>(commentsKey(projectId, taskId), (old) =>
        old ? upsertById(old, created, byCreatedAt) : old,
      );
      bumpBoardCommentCount(qc, projectId, taskId, 1);
      void qc.invalidateQueries({ queryKey: ['tasks', projectId, 'activities', taskId] });
      void qc.invalidateQueries({ queryKey: ['tasks', projectId, taskId, 'detail'] });
      void qc.invalidateQueries({ queryKey: ['tasks', 'feed'] });
    },
  });
}

export function useDeleteComment(projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => tasksApi.deleteComment(projectId, taskId, commentId),
    // Optimistic: gỡ ngay khỏi list, lỗi thì hoàn tác
    onMutate: async (commentId) => {
      const key = commentsKey(projectId, taskId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Comment[]>(key);
      if (previous) qc.setQueryData(key, removeById(previous, commentId));
      bumpBoardCommentCount(qc, projectId, taskId, -1);
      return { previous };
    },
    onError: (_err, _commentId, ctx) => {
      if (ctx?.previous) qc.setQueryData(commentsKey(projectId, taskId), ctx.previous);
      bumpBoardCommentCount(qc, projectId, taskId, 1);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks', projectId, 'activities', taskId] });
      void qc.invalidateQueries({ queryKey: ['tasks', projectId, taskId, 'detail'] });
      void qc.invalidateQueries({ queryKey: ['tasks', 'feed'] });
    },
  });
}
