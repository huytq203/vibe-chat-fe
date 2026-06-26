'use client';

import { ProjectList } from './ProjectList';
import { useTasksUIStore } from '../stores/tasks-ui.store';

export function TaskManagementLayout() {
  const selectedId = useTasksUIStore((s) => s.selectedProjectId);
  return (
    <div className="flex h-full w-full overflow-hidden">
      <ProjectList />
      <div className="flex-1 overflow-hidden">
        {selectedId ? (
          <div key={selectedId} className="p-4 text-muted-foreground">
            Board sẽ hiển thị ở Task 12…
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Chọn hoặc tạo một project để bắt đầu.
          </div>
        )}
      </div>
    </div>
  );
}
