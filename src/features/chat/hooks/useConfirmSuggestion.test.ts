import type { ReactNode } from 'react';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useConfirmCreateChangeRequest,
  useConfirmCreateCommitment,
  useConfirmCreateTask,
  useConfirmLinkExistingCommitment,
} from './useConfirmSuggestion';
import {
  changeRequestsApi,
  commitmentsApi,
} from '@/features/tasks/services/commitments.api';
import { tasksApi } from '@/features/tasks/services/tasks.api';

vi.mock('@/features/tasks/services/commitments.api', () => ({
  commitmentsApi: {
    create: vi.fn(),
    linkSourceRef: vi.fn(),
    linkTask: vi.fn(),
  },
  changeRequestsApi: { create: vi.fn() },
}));

vi.mock('@/features/tasks/services/tasks.api', () => ({
  tasksApi: { createTask: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => vi.clearAllMocks());

describe('useConfirmCreateCommitment', () => {
  it('nên gọi commitmentsApi.create với đúng input', async () => {
    vi.mocked(commitmentsApi.create).mockResolvedValue({
      id: 'c1',
      title: 'X',
      deliveryStatus: 'PLANNED',
      scopeStatus: 'UNCLEAR',
      ownerId: null,
      dueAt: null,
      deliveredAt: null,
      version: 1,
      createdAt: '2026-09-21T00:00:00.000Z',
      updatedAt: '2026-09-21T00:00:00.000Z',
      contact: null,
      risks: [],
      isReadyToDeliver: false,
    });
    const { result } = renderHook(
      () => useConfirmCreateCommitment('proj-1'),
      { wrapper },
    );

    result.current.mutate({
      title: 'X',
      scopeStatus: 'UNCLEAR',
      idempotencyKey: 'k1',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(commitmentsApi.create).toHaveBeenCalledWith(
      'proj-1',
      { title: 'X', scopeStatus: 'UNCLEAR' },
      'k1',
    );
  });
});

describe('useConfirmCreateChangeRequest', () => {
  it('nên gọi changeRequestsApi.create với đúng input', async () => {
    vi.mocked(changeRequestsApi.create).mockResolvedValue({
      id: 'cr1',
      title: 'X',
      status: 'DRAFT',
    });
    const { result } = renderHook(
      () => useConfirmCreateChangeRequest('proj-1'),
      { wrapper },
    );

    result.current.mutate({
      title: 'X',
      impact: 'Ảnh hưởng lớn',
      idempotencyKey: 'k4',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(changeRequestsApi.create).toHaveBeenCalledWith(
      'proj-1',
      { title: 'X', impact: 'Ảnh hưởng lớn' },
      'k4',
    );
  });
});

describe('useConfirmCreateTask', () => {
  it('nên tạo task rồi gắn vào commitment khi có commitmentId', async () => {
    vi.mocked(tasksApi.createTask).mockResolvedValue({ id: 't1' } as never);
    vi.mocked(commitmentsApi.linkTask).mockResolvedValue(undefined);
    const { result } = renderHook(() => useConfirmCreateTask('proj-1'), {
      wrapper,
    });

    result.current.mutate({
      title: 'Task X',
      columnId: 'col-1',
      commitmentId: 'c1',
      idempotencyKey: 'k2',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(tasksApi.createTask).toHaveBeenCalledWith(
      'proj-1',
      { title: 'Task X', columnId: 'col-1' },
      'k2',
    );
    expect(commitmentsApi.linkTask).toHaveBeenCalledWith('c1', 't1');
  });

  it('không gọi linkTask khi không có commitmentId', async () => {
    vi.mocked(tasksApi.createTask).mockResolvedValue({ id: 't1' } as never);
    const { result } = renderHook(() => useConfirmCreateTask('proj-1'), {
      wrapper,
    });

    result.current.mutate({
      title: 'Task X',
      columnId: 'col-1',
      idempotencyKey: 'k3',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(commitmentsApi.linkTask).not.toHaveBeenCalled();
  });
});

describe('useConfirmLinkExistingCommitment', () => {
  it('nên gọi commitmentsApi.linkSourceRef với đúng tham số', async () => {
    vi.mocked(commitmentsApi.linkSourceRef).mockResolvedValue(undefined);
    const { result } = renderHook(
      () => useConfirmLinkExistingCommitment(),
      { wrapper },
    );

    result.current.mutate({
      commitmentId: 'c1',
      sourceRef: {
        type: 'CHAT_MESSAGE',
        conversationId: 'conv-1',
        messageIds: ['m1'],
      },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(commitmentsApi.linkSourceRef).toHaveBeenCalledWith('c1', {
      type: 'CHAT_MESSAGE',
      conversationId: 'conv-1',
      messageIds: ['m1'],
    });
  });
});
