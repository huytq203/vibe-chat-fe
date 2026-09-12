'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTasksUIStore } from '../../stores/tasks-ui.store';

export function WorkDeepLinkSync() {
  const params = useSearchParams();
  const projectId = params.get('project');
  const taskId = params.get('task');
  const selectProject = useTasksUIStore((state) => state.setSelectedProjectId);
  const openTask = useTasksUIStore((state) => state.openTask);

  useEffect(() => {
    if (projectId) selectProject(projectId);
    if (projectId && taskId) openTask(taskId);
  }, [openTask, projectId, selectProject, taskId]);

  return null;
}
