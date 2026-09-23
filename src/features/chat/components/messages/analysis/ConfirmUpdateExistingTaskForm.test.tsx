import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { tasksApi } from '@/features/tasks/services/tasks.api';
import { ConfirmUpdateExistingTaskForm } from './ConfirmUpdateExistingTaskForm';

vi.mock('@/features/tasks/services/tasks.api', () => ({
  tasksApi: { getTask: vi.fn(), listMembers: vi.fn(), updateTask: vi.fn(), addAssignee: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const ACTION = {
  type: 'UPDATE_EXISTING_TASK',
  title: 'Cập nhật task',
  description: 'Mô tả',
  targetCommitmentId: null,
  targetTaskId: 'task-1',
  dueDate: '2026-10-15',
};

function renderForm(onDone = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  render(<QueryClientProvider client={queryClient}><ConfirmUpdateExistingTaskForm projectId="proj-1" action={ACTION} onDone={onDone} /></QueryClientProvider>);
  return { onDone, invalidate };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(tasksApi.getTask).mockResolvedValue({ id: 'task-1', title: 'Task đích', dueDate: '2026-10-10', version: 7 } as never);
  vi.mocked(tasksApi.listMembers).mockResolvedValue([{ userId: 'user-1', displayName: 'Nguyễn An', avatarUrl: null }] as never);
});

describe('ConfirmUpdateExistingTaskForm', () => {
  it('nên hiện tiêu đề task đích', async () => {
    renderForm();
    expect(await screen.findByText('Task đích')).toBeInTheDocument();
    expect(screen.getByDisplayValue('15/10/2026')).toBeInTheDocument();
  });

  it('nên gửi PATCH kèm version và gán người khi xác nhận', async () => {
    vi.mocked(tasksApi.updateTask).mockResolvedValue({ id: 'task-1' } as never);
    vi.mocked(tasksApi.addAssignee).mockResolvedValue(undefined);
    const { onDone, invalidate } = renderForm();
    const user = userEvent.setup();
    await screen.findByText('Task đích');
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Nguyễn An' }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận cập nhật task' }));
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(tasksApi.updateTask).toHaveBeenCalledWith('task-1', { dueDate: '2026-10-15', version: 7 });
    expect(tasksApi.addAssignee).toHaveBeenCalledWith('proj-1', 'task-1', { userId: 'user-1', displayName: 'Nguyễn An', avatarUrl: null });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['tasks', 'proj-1', 'board'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['tasks', 'proj-1', 'task-1', 'detail'] });
    expect(toast.success).toHaveBeenCalledWith('Đã cập nhật task');
  });

  it('nên báo lỗi xung đột khi task đã bị sửa', async () => {
    vi.mocked(tasksApi.updateTask).mockRejectedValue(Object.assign(new Error('Conflict'), { status: 409 }));
    const { onDone } = renderForm();
    await screen.findByText('Task đích');
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận cập nhật task' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Task vừa được người khác cập nhật, hãy tải lại'));
    expect(tasksApi.addAssignee).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });
});
