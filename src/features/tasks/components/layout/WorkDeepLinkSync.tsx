'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTasksUIStore } from '../../stores/tasks-ui.store';

export function WorkDeepLinkSync() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const projectId = params.get('project');
  const taskId = params.get('task');
  const selectedProjectId = useTasksUIStore((state) => state.selectedProjectId);
  const selectedTaskId = useTasksUIStore((state) => state.selectedTaskId);
  const selectProject = useTasksUIStore((state) => state.setSelectedProjectId);
  const openTask = useTasksUIStore((state) => state.openTask);
  const previousSelectedTaskId = useRef(selectedTaskId);

  useEffect(() => {
    if (projectId && projectId !== selectedProjectId) selectProject(projectId);
    if (projectId && taskId) openTask(taskId);
  }, [openTask, projectId, selectProject, selectedProjectId, taskId]);

  useEffect(() => {
    const previousTaskId = previousSelectedTaskId.current;
    previousSelectedTaskId.current = selectedTaskId;

    // Sau khi đóng task mở từ deep link, bỏ `task` khỏi URL. Nếu giữ nguyên URL,
    // click lại cùng link sẽ không tạo thay đổi search params nên modal không mở lại.
    if (!previousTaskId || selectedTaskId || taskId !== previousTaskId) return;

    const nextParams = new URLSearchParams(params.toString());
    nextParams.delete('task');
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [params, pathname, router, selectedTaskId, taskId]);

  return null;
}
