import { describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/test/test-utils';
import { TaskManagementLayout } from './TaskManagementLayout';
import { useTasksUIStore } from '../stores/tasks-ui.store';

describe('TaskManagementLayout', () => {
  beforeEach(() => {
    useTasksUIStore.setState({ activeView: 'home', selectedProjectId: null });
  });

  it('mặc định hiển thị Trang chủ và sidebar', () => {
    renderWithProviders(<TaskManagementLayout />);
    expect(screen.getByRole('button', { name: 'Trang chủ' })).toBeInTheDocument();
  });

  it('bấm Báo cáo chuyển sang ReportsView', () => {
    renderWithProviders(<TaskManagementLayout />);
    fireEvent.click(screen.getByRole('button', { name: 'Báo cáo' }));
    expect(useTasksUIStore.getState().activeView).toBe('reports');
  });
});
