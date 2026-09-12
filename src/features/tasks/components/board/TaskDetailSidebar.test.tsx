import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { aiApi } from '@/services/ai.api';
import type { TaskDetail } from '../../types';
import { TaskDetailSidebar } from './TaskDetailSidebar';

const updateTaskMutation = vi.hoisted(() => ({
  mutate: vi.fn(),
  isPending: false,
}));

vi.mock('../../hooks/useTaskDetail', () => ({
  useUpdateTask: () => updateTaskMutation,
}));
vi.mock('../../hooks/useAssignees', () => ({
  useAssignees: () => ({ data: [] }),
  useAddAssignee: () => ({ mutate: vi.fn(), isPending: false }),
  useRemoveAssignee: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../../hooks/useTaskTags', () => ({
  useTaskTags: () => ({ data: [] }),
  useProjectTags: () => ({ data: [] }),
  useAttachTag: () => ({ mutate: vi.fn() }),
  useDetachTag: () => ({ mutate: vi.fn() }),
}));
vi.mock('../../hooks/useMembers', () => ({
  useMembers: () => ({ data: [] }),
}));
vi.mock('../../lib/current-user', () => ({
  getCurrentUser: () => null,
}));
vi.mock('@/services/ai.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/ai.api')>();
  return {
    ...actual,
    aiApi: {
      ...actual.aiApi,
      estimateGem: vi.fn(),
    },
  };
});

const task = {
  id: 'task-1',
  version: 1,
  projectId: 'project-1',
  columnId: 'column-1',
  title: 'Chuẩn bị bản phát hành',
  description: 'Kiểm tra toàn bộ luồng.',
  dueDate: null,
  priority: null,
  isPinned: false,
  position: 1000,
  assigneeCount: 0,
  commentCount: 0,
  checklistTotal: 0,
  checklistDone: 0,
  completedAt: null,
  reviewRequestedAt: null,
  reviewRequestedBy: null,
  status: 'OPEN',
  parentId: null,
  subtaskCount: 0,
  tags: [],
  gem: null,
  gemSource: null,
  createdAt: '2026-09-12T01:00:00.000Z',
  updatedAt: '2026-09-12T01:00:00.000Z',
} satisfies TaskDetail;

describe('gem trong thanh bên chi tiết công việc', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(aiApi.estimateGem).mockResolvedValue({
      gem: 42,
      reason: 'Khối lượng ở mức vừa.',
    });
  });

  it('hiện gem do AI chấm và lưu điểm vào công việc', async () => {
    renderWithProviders(
      <TaskDetailSidebar projectId="project-1" taskId="task-1" task={task} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'AI chấm gem' }));

    const input = await screen.findByRole('spinbutton', { name: 'Điểm gem' });
    await waitFor(() => expect(input).toHaveValue(42));
    expect(input).toHaveAttribute('title', 'Khối lượng ở mức vừa.');
    expect(aiApi.estimateGem).toHaveBeenCalledWith({
      title: 'Chuẩn bị bản phát hành',
      description: 'Kiểm tra toàn bộ luồng.',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Lưu gem' }));
    expect(updateTaskMutation.mutate).toHaveBeenCalledWith({ gem: 42 });
  });
});
