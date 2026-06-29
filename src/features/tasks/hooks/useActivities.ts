import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';

export function useTaskActivities(projectId: string, taskId: string | null) {
  return useQuery({
    queryKey: ['tasks', projectId, 'activities', taskId],
    queryFn: async () => {
      const all = await tasksApi.listActivities(projectId);
      // BE chưa có filter taskId → filter client-side
      return all.filter((a) => a.entityId === taskId);
    },
    enabled: !!projectId && !!taskId,
  });
}
