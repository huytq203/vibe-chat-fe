import { describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/test/test-utils';
import { TaskManagementLayout } from '../components/layout/TaskManagementLayout';
import { useTasksUIStore } from '../stores/tasks-ui.store';

describe('TaskManagementLayout', () => {
  beforeEach(() => {
    useTasksUIStore.setState({ activeView: 'home', selectedProjectId: null });
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
});
