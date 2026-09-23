import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tasksApi } from '@/features/tasks/services/tasks.api';
import { ConfirmCreateTaskForm } from './ConfirmCreateTaskForm';

vi.mock('@/features/tasks/services/tasks.api', () => ({
  tasksApi: { createTask: vi.fn(), getBoard: vi.fn() },
}));
const ACTION = {
  type: 'CREATE_TASK' as const,
  title: 'Task X',
  description: 'Mô tả task X',
  dueDate: '2026-10-15',
};

function renderForm(onDone = vi.fn(), action = ACTION) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ConfirmCreateTaskForm projectId="proj-1" action={action} onDone={onDone} />
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

  it('nên điền sẵn hạn chót từ gợi ý', () => {
    renderForm();
    expect(screen.getByDisplayValue('15/10/2026')).toBeInTheDocument();
  });

  it('nên tạo task và báo hoàn tất', async () => {
    const user = userEvent.setup();
    vi.mocked(tasksApi.createTask).mockResolvedValue({ id: 'task-1' } as never);
    const onDone = vi.fn();
    renderForm(onDone);

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Cần làm' }));
    await user.click(screen.getByRole('button', { name: /xác nhận tạo task/i }));

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(tasksApi.createTask).toHaveBeenCalledWith(
      'proj-1',
      { title: 'Task X', columnId: 'column-1', description: 'Mô tả task X', dueDate: '2026-10-15' },
      expect.any(String),
    );
  });

  it('nên gửi mô tả và hạn chót khi tạo task', async () => {
    vi.mocked(tasksApi.createTask).mockResolvedValue({ id: 'task-1' } as never);
    renderForm();
    fireEvent.change(screen.getByLabelText('Mô tả'), { target: { value: '  Nội dung thật  ' } });
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Cần làm' }));
    await user.click(screen.getByRole('button', { name: /xác nhận tạo task/i }));
    await waitFor(() => expect(tasksApi.createTask).toHaveBeenCalledWith('proj-1', { title: 'Task X', columnId: 'column-1', description: 'Nội dung thật', dueDate: '2026-10-15' }, expect.any(String)));
  });

  it('nên không gửi mô tả khi mô tả rỗng', async () => {
    vi.mocked(tasksApi.createTask).mockResolvedValue({ id: 'task-1' } as never);
    renderForm();
    fireEvent.change(screen.getByLabelText('Mô tả'), { target: { value: '   ' } });
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Cần làm' }));
    await user.click(screen.getByRole('button', { name: /xác nhận tạo task/i }));
    await waitFor(() => expect(tasksApi.createTask).toHaveBeenCalledWith('proj-1', { title: 'Task X', columnId: 'column-1', dueDate: '2026-10-15' }, expect.any(String)));
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
