'use client';

import { ProjectList } from './ProjectList';
import { KanbanBoard } from './KanbanBoard';
import { useTasksUIStore } from '../stores/tasks-ui.store';

export function TaskManagementLayout() {
  const selectedId = useTasksUIStore((s) => s.selectedProjectId);
  return (
    <div className="flex h-full w-full overflow-hidden">
      <ProjectList />
      <div className="flex-1 overflow-hidden">
        {selectedId ? (
          <KanbanBoard key={selectedId} projectId={selectedId} />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Chọn hoặc tạo một project để bắt đầu.
          </div>
        )}
      </div>
    </div>
  );
}
