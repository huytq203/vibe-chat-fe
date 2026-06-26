'use client';

import { ProjectList } from './ProjectList';
import { KanbanBoard } from './KanbanBoard';
import { Dashboard } from './Dashboard';
import { useTasksUIStore } from '../stores/tasks-ui.store';

export function TaskManagementLayout() {
  const selectedId = useTasksUIStore((s) => s.selectedProjectId);
  return (
    <div className="flex h-full w-full overflow-hidden">
      <ProjectList />
      <div className="flex-1 overflow-hidden">
        {/* Chưa chọn project → màn Home (Dashboard). Board giữ bản cũ, chờ design mới. */}
        {selectedId ? <KanbanBoard key={selectedId} projectId={selectedId} /> : <Dashboard />}
      </div>
    </div>
  );
}
