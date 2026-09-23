import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/test/test-utils';
import { TaskManagementLayout } from '../components/layout/TaskManagementLayout';
import { useTasksUIStore } from '../stores/tasks-ui.store';
import type { Project } from '../types';

const project: Project = {
  id: 'proj-1',
  name: 'Dự án thử nghiệm',
  description: null,
  ownerId: 'user-1',
  isBoardLocked: false,
  status: 'ACTIVE',
  isOverdue: false,
  startDate: null,
  endDate: null,
  createdAt: '2026-09-23T00:00:00.000Z',
  updatedAt: '2026-09-23T00:00:00.000Z',
};

vi.mock('../hooks/useProjects', () => ({ useProjects: () => ({ data: [project] }) }));
vi.mock('../hooks/useMembers', () => ({ useMembers: () => ({ data: [] }) }));
vi.mock('../components/board/KanbanBoard', () => ({
  KanbanBoard: () => <div role="region" aria-label="Bảng nhiệm vụ thử nghiệm" />,
}));
vi.mock('../components/board/ListView', () => ({
  ListView: () => <div role="region" aria-label="Danh sách nhiệm vụ thử nghiệm" />,
}));
vi.mock('../components/board/TaskDetailModal', () => ({ TaskDetailModal: () => null }));
vi.mock('../components/projects/ProjectSettingsModal', () => ({ ProjectSettingsModal: () => null }));

describe('Trang quản lý công việc', () => {
  beforeEach(() => {
    useTasksUIStore.setState({ activeView: 'home', selectedProjectId: null, boardView: 'board', settingsModal: { open: false } });
  });

  it('mặc định hiển thị Trang chủ trong thanh điều hướng ổn định', () => {
    renderWithProviders(<TaskManagementLayout />);
    expect(screen.getByRole('button', { name: 'Trang chủ' })).toHaveAttribute('aria-current', 'page');
  });

  it('bấm Báo cáo chuyển sang ReportsView', () => {
    renderWithProviders(<TaskManagementLayout />);
    fireEvent.click(screen.getByRole('button', { name: 'Báo cáo' }));
    expect(useTasksUIStore.getState().activeView).toBe('reports');
  });

  it('nên giữ nguyên hành vi hiện tại khi user là OWNER', () => {
    useTasksUIStore.setState({ activeView: 'board', selectedProjectId: project.id });

    renderWithProviders(<TaskManagementLayout />);

    expect(screen.getByRole('region', { name: 'Bảng nhiệm vụ thử nghiệm' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Kiểu hiển thị' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cài đặt project' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chia sẻ dự án' })).toBeInTheDocument();
  });
});
