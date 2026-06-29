'use client';

import { ProjectList } from './ProjectList';
import { KanbanBoard } from './KanbanBoard';
import { Dashboard } from './Dashboard';
import { BoardHeader } from './BoardHeader';
import { ListView } from './ListView';
import { TaskDetailModal } from './TaskDetailModal';
import { ProjectSettingsModal } from './ProjectSettingsModal';
import { useTasksUIStore } from '../stores/tasks-ui.store';
import { useProjects } from '../hooks/useProjects';

export function TaskManagementLayout() {
  const selectedId = useTasksUIStore((s) => s.selectedProjectId);
  const boardView = useTasksUIStore((s) => s.boardView);
  const { data: projects = [] } = useProjects();
  const selectedProject = projects.find((p) => p.id === selectedId);

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
            {selectedProject && <ProjectSettingsModal project={selectedProject} />}
          </>
        ) : (
          <Dashboard />
        )}
      </div>
    </div>
  );
}
