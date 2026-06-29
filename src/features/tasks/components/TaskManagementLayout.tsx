'use client';

import { useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { Dashboard } from './Dashboard';
import { ProjectsPage } from './ProjectsPage';
import { ReportsView } from './ReportsView';
import { BoardHeader } from './BoardHeader';
import { KanbanBoard } from './KanbanBoard';
import { ListView } from './ListView';
import { TaskDetailModal } from './TaskDetailModal';
import { ProjectSettingsModal } from './ProjectSettingsModal';
import { NewProjectModal } from './NewProjectModal';
import { useTasksUIStore } from '../stores/tasks-ui.store';
import { useProjects } from '../hooks/useProjects';

export function TaskManagementLayout() {
  const activeView = useTasksUIStore((s) => s.activeView);
  const setActiveView = useTasksUIStore((s) => s.setActiveView);
  const selectedId = useTasksUIStore((s) => s.selectedProjectId);
  const boardView = useTasksUIStore((s) => s.boardView);
  const { data: projects = [] } = useProjects();
  const selectedProject = projects.find((p) => p.id === selectedId);

  const [newProjectOpen, setNewProjectOpen] = useState(false);

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <AppSidebar activeView={activeView} onNavigate={setActiveView} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader
          activeView={activeView}
          selectedProject={selectedProject}
          onCreateProject={() => setNewProjectOpen(true)}
        />

        <main className="relative min-h-0 flex-1 overflow-hidden">
          {activeView === 'home' && <Dashboard />}
          {activeView === 'projects' && <ProjectsPage />}
          {activeView === 'reports' && <ReportsView />}
          {activeView === 'board' &&
            (selectedId && selectedProject ? (
              <div className="flex h-full flex-col">
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

      <NewProjectModal open={newProjectOpen} onOpenChange={setNewProjectOpen} />
    </div>
  );
}
