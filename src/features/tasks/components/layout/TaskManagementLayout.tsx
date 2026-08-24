'use client';

import { useState } from 'react';
import { AppHeader } from './AppHeader';
import { Dashboard } from '../dashboard';
import { ReportsView } from '../reports';
import { ProjectsPage, ProjectSettingsModal, NewProjectModal } from '../projects';
import { BoardHeader, KanbanBoard, ListView, ProjectSwitcher, TaskDetailModal } from '../board';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import { useProjects } from '../../hooks/useProjects';
import { useTaskRealtime, useTaskSocketWarmup } from '../../hooks/useTaskRealtime';
import { useCurrentUserSnapshotSync } from '../../hooks/useCurrentUserSnapshotSync';
import { getViewTitle } from '../../lib/view-title';

export function TaskManagementLayout() {
  const activeView = useTasksUIStore((s) => s.activeView);
  const selectedId = useTasksUIStore((s) => s.selectedProjectId);
  const boardView = useTasksUIStore((s) => s.boardView);
  // Sửa/duy trì UserSnapshot chuẩn trước khi hiển thị tên trong task-service.
  useCurrentUserSnapshotSync();
  // Kết nối socket ngay khi vào /work — board mở lần đầu không tốn handshake
  useTaskSocketWarmup();
  // Realtime: join room project đang mở, đồng bộ board/detail giữa các thành viên
  useTaskRealtime(selectedId);
  const { data: projects = [] } = useProjects();
  const selectedProject = projects.find((p) => p.id === selectedId);
  const boardMeta = getViewTitle('board', selectedProject);

  const [newProjectOpen, setNewProjectOpen] = useState(false);

  return (
    <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden md:gap-3">
      <AppHeader onCreateProject={() => setNewProjectOpen(true)} />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <main className="relative min-h-0 flex-1 overflow-hidden bg-background md:rounded-2xl md:border">
          {activeView === 'home' && <Dashboard />}
          {activeView === 'projects' && <ProjectsPage />}
          {activeView === 'reports' && <ReportsView />}
          {activeView === 'board' &&
            (selectedId && selectedProject ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="shrink-0 border-b bg-background">
                  <div className="flex min-w-0 flex-col gap-0.5 px-4 pb-2 pt-3 sm:px-5 sm:pt-4">
                    <ProjectSwitcher selectedProjectId={selectedId} selectedName={boardMeta.title} />
                    {boardMeta.sub && (
                      <p className="truncate text-xs text-muted-foreground sm:text-sm">{boardMeta.sub}</p>
                    )}
                  </div>
                  <BoardHeader projectId={selectedId} />
                </div>
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
