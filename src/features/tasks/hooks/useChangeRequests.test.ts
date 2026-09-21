import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useChangeRequestsInfinite,
  useCreateChangeRequest,
  useTransitionChangeRequest,
} from './useChangeRequests';
import { changeRequestsApi } from '../services/commitments.api';

vi.mock('../services/commitments.api', () => ({
  changeRequestsApi: {
    listPaged: vi.fn(),
    getDetail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    transition: vi.fn(),
    removeSourceRef: vi.fn(),
  },
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => vi.clearAllMocks());

describe('useChangeRequestsInfinite', () => {
  it('nên gọi changeRequestsApi.listPaged với đúng filter', async () => {
    vi.mocked(changeRequestsApi.listPaged).mockResolvedValue({
      data: [],
      meta: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    });
    const { result } = renderHook(
      () => useChangeRequestsInfinite('proj-1', { status: 'DRAFT' }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(changeRequestsApi.listPaged).toHaveBeenCalledWith('proj-1', {
      page: 1,
      limit: 20,
      status: 'DRAFT',
    });
  });
});

describe('useCreateChangeRequest', () => {
  it('nên gọi changeRequestsApi.create với idempotency key mới', async () => {
    vi.mocked(changeRequestsApi.create).mockResolvedValue({} as never);
    const { result } = renderHook(
      () => useCreateChangeRequest('proj-1'),
      { wrapper },
    );

    result.current.mutate({ title: 'X', impact: 'Ảnh hưởng lớn' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(changeRequestsApi.create).toHaveBeenCalledWith(
      'proj-1',
      { title: 'X', impact: 'Ảnh hưởng lớn' },
      expect.any(String),
    );
  });
});

describe('useTransitionChangeRequest', () => {
  it('nên gọi changeRequestsApi.transition với đúng tham số', async () => {
    vi.mocked(changeRequestsApi.transition).mockResolvedValue({} as never);
    const { result } = renderHook(
      () => useTransitionChangeRequest('proj-1', 'cr1'),
      { wrapper },
    );

    result.current.mutate({ to: 'INTERNAL_APPROVED', version: 1 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(changeRequestsApi.transition).toHaveBeenCalledWith('cr1', {
      to: 'INTERNAL_APPROVED',
      version: 1,
    });
  });
});
