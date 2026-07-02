import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';

/** Lịch sử hoạt động của một task (tab History trong modal) — lọc server-side theo taskId. */
export function useTaskActivities(projectId: string, taskId: string | null) {
  return useQuery({
    queryKey: ['tasks', projectId, 'activities', taskId],
    queryFn: async () => {
      const res = await tasksApi.listActivities(projectId, taskId!);
      return res.items;
    },
    enabled: !!projectId && !!taskId,
  });
}
