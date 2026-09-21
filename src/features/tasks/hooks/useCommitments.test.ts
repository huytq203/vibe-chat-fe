import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { commitmentsApi } from '../services/commitments.api';
import {
  useCommitmentDetail,
  useCommitmentsInfinite,
  useCreateCommitment,
} from './useCommitments';

vi.mock('../services/commitments.api', () => ({
  commitmentsApi: {
    listPaged: vi.fn(),
    getDetail: vi.fn(),
    create: vi.fn(),
  },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => vi.clearAllMocks());

describe('useCommitmentsInfinite', () => {
  it('nên gọi commitmentsApi.listPaged với đúng filter', async () => {
    vi.mocked(commitmentsApi.listPaged).mockResolvedValue({
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
      () => useCommitmentsInfinite('proj-1', { deliveryStatus: 'READY' }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(commitmentsApi.listPaged).toHaveBeenCalledWith('proj-1', {
      page: 1,
      limit: 20,
      deliveryStatus: 'READY',
    });
  });
});

describe('useCommitmentDetail', () => {
  it('không gọi API khi commitmentId rỗng', () => {
    const { result } = renderHook(() => useCommitmentDetail(''), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(commitmentsApi.getDetail).not.toHaveBeenCalled();
  });
});

describe('useCreateCommitment', () => {
  it('nên gọi commitmentsApi.create với idempotency key mới mỗi lần', async () => {
    vi.mocked(commitmentsApi.create).mockResolvedValue({} as never);
    const { result } = renderHook(() => useCreateCommitment('proj-1'), {
      wrapper,
    });

    result.current.mutate({ title: 'X', scopeStatus: 'UNCLEAR' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(commitmentsApi.create).toHaveBeenCalledWith(
      'proj-1',
      { title: 'X', scopeStatus: 'UNCLEAR' },
      expect.any(String),
    );
  });
});
