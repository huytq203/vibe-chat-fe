import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { commitmentsApi } from '@/features/tasks/services/commitments.api';
import { tasksApi } from '@/features/tasks/services/tasks.api';
import { ConfirmCreateTaskForm } from './ConfirmCreateTaskForm';

vi.mock('@/features/tasks/services/tasks.api', () => ({
  tasksApi: { createTask: vi.fn(), getBoard: vi.fn() },
}));
vi.mock('@/features/tasks/services/commitments.api', () => ({
  commitmentsApi: { linkTask: vi.fn() },
}));

const ACTION = {
  type: 'CREATE_TASK' as const,
  title: 'Task X',
  description: 'Mô tả task X',
  targetCommitmentId: 'commitment-1',
};

function renderForm(onDone = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ConfirmCreateTaskForm projectId="proj-1" action={ACTION} onDone={onDone} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(tasksApi.getBoard).mockResolvedValue({
    project: {},
    columns: [
      {
        id: 'column-1',
        name: 'Cần làm',
        color: null,
        position: 0,
        isDoneCol: false,
        tasks: [],
      },
    ],
  } as never);
});

describe('ConfirmCreateTaskForm', () => {
  it('nên điền sẵn tiêu đề và mô tả từ đề xuất', () => {
    renderForm();

    expect(screen.getByDisplayValue('Task X')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Mô tả task X')).toBeInTheDocument();
  });

  it('nên tạo task rồi gắn task vào cam kết và báo hoàn tất', async () => {
    const user = userEvent.setup();
    vi.mocked(tasksApi.createTask).mockResolvedValue({ id: 'task-1' } as never);
    vi.mocked(commitmentsApi.linkTask).mockResolvedValue(undefined);
    const onDone = vi.fn();
    renderForm(onDone);

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Cần làm' }));
    await user.click(screen.getByRole('button', { name: /xác nhận tạo task/i }));

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(tasksApi.createTask).toHaveBeenCalledWith(
      'proj-1',
      { title: 'Task X', columnId: 'column-1' },
      expect.any(String),
    );
    expect(commitmentsApi.linkTask).toHaveBeenCalledWith('commitment-1', 'task-1');
  });

  it('nên vô hiệu hóa nút xác nhận khi thiếu tiêu đề hoặc cột', async () => {
    const user = userEvent.setup();
    renderForm();
    const button = screen.getByRole('button', { name: /xác nhận tạo task/i });

    expect(button).toBeDisabled();

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Cần làm' }));
    expect(button).toBeEnabled();

    fireEvent.change(screen.getByLabelText(/tiêu đề task/i), {
      target: { value: '' },
    });
    expect(button).toBeDisabled();
  });
});
