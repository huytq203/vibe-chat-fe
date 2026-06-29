'use client';

import { ProjectList } from './ProjectList';
import { KanbanBoard } from './KanbanBoard';
import { Dashboard } from './Dashboard';
import { BoardHeader } from './BoardHeader';
import { ListView } from './ListView';
import { TaskDetailModal } from './TaskDetailModal';
import { useTasksUIStore } from '../stores/tasks-ui.store';

export function TaskManagementLayout() {
  const selectedId = useTasksUIStore((s) => s.selectedProjectId);
  const boardView = useTasksUIStore((s) => s.boardView);

  return (
    <div className="flex h-full w-full overflow-hidden">
      <ProjectList />
      <div className="flex flex-1 flex-col overflow-hidden">
        {selectedId ? (
          <>
            <BoardHeader projectId={selectedId} />
            {boardView === 'board' ? (
              <KanbanBoard key={selectedId} projectId={selectedId} />
            ) : (
              <ListView projectId={selectedId} />
            )}
            <TaskDetailModal projectId={selectedId} />
          </>
        ) : (
          <Dashboard />
        )}
      </div>
    </div>
  );
}
