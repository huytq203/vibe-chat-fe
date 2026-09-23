import type { ReactNode } from 'react';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useConfirmCreateTask,
} from './useConfirmSuggestion';
import { tasksApi } from '@/features/tasks/services/tasks.api';

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

describe('useConfirmCreateTask', () => {
  it('nên tạo task từ gợi ý AI', async () => {
    vi.mocked(tasksApi.createTask).mockResolvedValue({ id: 't1' } as never);
    const { result } = renderHook(() => useConfirmCreateTask('proj-1'), { wrapper });
    result.current.mutate({ title: 'Task X', columnId: 'col-1', idempotencyKey: 'k2' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(tasksApi.createTask).toHaveBeenCalledWith(
      'proj-1', { title: 'Task X', columnId: 'col-1' }, 'k2',
    );
  });
});
