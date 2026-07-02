import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';
import { taskKeys } from '../services/keys';
import { upsertById, patchById, removeById } from '../lib/list-cache';
import { bumpTaskCount } from '../lib/board-cache';
import type { Board, ChecklistItem } from '../types';

const checklistKey = (projectId: string, taskId: string | null) =>
  ['tasks', projectId, taskId, 'checklist'] as const;

const byPosition = (a: ChecklistItem, b: ChecklistItem): number => a.position - b.position;

/** Cập nhật checklistCount trên card board tại chỗ — không refetch cả board */
function bumpBoardChecklistCount(
  qc: QueryClient,
  projectId: string,
  taskId: string,
  delta: number,
): void {
  qc.setQueryData<Board>(taskKeys.board(projectId), (old) =>
    old ? (bumpTaskCount(old, taskId, 'checklistCount', delta) ?? old) : old,
  );
}

export function useChecklist(projectId: string, taskId: string | null) {
  return useQuery({
    queryKey: checklistKey(projectId, taskId),
    queryFn: () => tasksApi.listChecklist(projectId, taskId!),
    enabled: !!projectId && !!taskId,
  });
}

export function useCreateChecklistItem(projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      tasksApi.createChecklistItem(projectId, taskId, { content }),
    // Write-through: item hiện ngay từ response (event realtime dedupe theo id)
    onSuccess: (created) => {
      qc.setQueryData<ChecklistItem[]>(checklistKey(projectId, taskId), (old) =>
        old ? upsertById(old, created, byPosition) : old,
      );
      bumpBoardChecklistCount(qc, projectId, taskId, 1);
      void qc.invalidateQueries({ queryKey: ['tasks', projectId, taskId, 'detail'] });
    },
  });
}

export function useUpdateChecklistItem(projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, isDone, content }: { itemId: string; isDone?: boolean; content?: string }) =>
      tasksApi.updateChecklistItem(projectId, taskId, itemId, { isDone, content }),
    // Optimistic: tick checkbox nhảy ngay, lỗi thì hoàn tác
    onMutate: async ({ itemId, isDone, content }) => {
      const key = checklistKey(projectId, taskId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<ChecklistItem[]>(key);
      if (previous) {
        const patch: Partial<ChecklistItem> = {};
        if (isDone !== undefined) patch.isDone = isDone;
        if (content !== undefined) patch.content = content;
        const next = patchById(previous, itemId, patch);
        if (next) qc.setQueryData(key, next);
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(checklistKey(projectId, taskId), ctx.previous);
    },
    // Server là nguồn chuẩn — ghi đè item bằng response, không cần refetch list
    onSuccess: (updated) => {
      qc.setQueryData<ChecklistItem[]>(checklistKey(projectId, taskId), (old) =>
        old ? upsertById(old, updated, byPosition) : old,
      );
      void qc.invalidateQueries({ queryKey: ['tasks', projectId, taskId, 'detail'] });
    },
  });
}

export function useDeleteChecklistItem(projectId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => tasksApi.deleteChecklistItem(projectId, taskId, itemId),
    // Optimistic: gỡ ngay khỏi list, lỗi thì hoàn tác
    onMutate: async (itemId) => {
      const key = checklistKey(projectId, taskId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<ChecklistItem[]>(key);
      if (previous) qc.setQueryData(key, removeById(previous, itemId));
      bumpBoardChecklistCount(qc, projectId, taskId, -1);
      return { previous };
    },
    onError: (_err, _itemId, ctx) => {
      if (ctx?.previous) qc.setQueryData(checklistKey(projectId, taskId), ctx.previous);
      bumpBoardChecklistCount(qc, projectId, taskId, 1);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks', projectId, taskId, 'detail'] });
    },
  });
}
