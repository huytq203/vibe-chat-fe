import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';
import { taskKeys } from '../services/keys';

/** Danh sách task con của một task (tab/section "Task con" trong modal). */
export function useSubtasks(projectId: string, parentTaskId: string | null) {
  return useQuery({
    queryKey: ['tasks', projectId, parentTaskId, 'subtasks'],
    queryFn: () => tasksApi.listSubtasks(parentTaskId!),
    enabled: !!projectId && !!parentTaskId,
  });
}

/** Tạo task con — invalidate danh sách con + detail của cha (subtaskCount) + board. */
export function useCreateSubtask(projectId: string, parentTaskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => tasksApi.createSubtask(parentTaskId, title),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ['tasks', projectId, parentTaskId, 'subtasks'],
      });
      void qc.invalidateQueries({
        queryKey: ['tasks', projectId, parentTaskId, 'detail'],
      });
      void qc.invalidateQueries({ queryKey: taskKeys.board(projectId) });
    },
  });
}
