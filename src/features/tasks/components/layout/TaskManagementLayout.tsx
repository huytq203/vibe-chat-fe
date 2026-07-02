'use client';

import { useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { Dashboard } from '../dashboard';
import { ReportsView } from '../reports';
import { ProjectsPage, ProjectSettingsModal, NewProjectModal } from '../projects';
import { BoardHeader, KanbanBoard, ListView, ProjectSwitcher, TaskDetailModal } from '../board';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import { useProjects } from '../../hooks/useProjects';
import { useTaskRealtime } from '../../hooks/useTaskRealtime';
import { getViewTitle } from '../../lib/view-title';

export function TaskManagementLayout() {
  const activeView = useTasksUIStore((s) => s.activeView);
  const setActiveView = useTasksUIStore((s) => s.setActiveView);
  const selectedId = useTasksUIStore((s) => s.selectedProjectId);
  const boardView = useTasksUIStore((s) => s.boardView);
  // Realtime: join room project đang mở, đồng bộ board/detail giữa các thành viên
  useTaskRealtime(selectedId);
  const { data: projects = [] } = useProjects();
  const selectedProject = projects.find((p) => p.id === selectedId);
  const boardMeta = getViewTitle('board', selectedProject);

  const [newProjectOpen, setNewProjectOpen] = useState(false);

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-background">
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader onCreateProject={() => setNewProjectOpen(true)} />

        <main className="relative min-h-0 flex-1 overflow-hidden">
          {activeView === 'home' && <Dashboard />}
          {activeView === 'projects' && <ProjectsPage />}
          {activeView === 'reports' && <ReportsView />}
          {activeView === 'board' &&
            (selectedId && selectedProject ? (
              <div className="flex h-full flex-col">
                <div className="mb-0 flex min-w-0 flex-col gap-1 px-6 pt-5">
                  <ProjectSwitcher selectedProjectId={selectedId} selectedName={boardMeta.title} />
                  {boardMeta.sub && (
                    <p className="truncate text-sm text-muted-foreground">{boardMeta.sub}</p>
                  )}
                </div>
                <BoardHeader projectId={selectedId} />
                {boardView === 'board' ? (
                  <KanbanBoard key={selectedId} projectId={selectedId} />
                ) : (
                  <ListView projectId={selectedId} />
                )}
                <TaskDetailModal projectId={selectedId} />
                <ProjectSettingsModal project={selectedProject} />
              </div>
            ) : (
              <div className="grid h-full place-items-center text-muted-foreground">
                Chọn một dự án để xem bảng nhiệm vụ.
              </div>
            ))}
        </main>
      </div>

      <AppSidebar activeView={activeView} onNavigate={setActiveView} />

      <NewProjectModal open={newProjectOpen} onOpenChange={setNewProjectOpen} />
    </div>
  );
}
