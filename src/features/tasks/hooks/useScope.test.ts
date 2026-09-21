import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { scopeApi } from '../services/scope.api';
import { useAddScopeItem, useUpdateScopeItem } from './useScope';

vi.mock('../services/scope.api', () => ({
  scopeApi: {
    get: vi.fn(),
    updateDocument: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => vi.clearAllMocks());

describe('useAddScopeItem', () => {
  it('nên gọi scopeApi.addItem với đúng dự án, nội dung và phiên bản', async () => {
    vi.mocked(scopeApi.addItem).mockResolvedValue({
      projectId: 'proj-1',
      rawDocument: null,
      version: 3,
      items: [],
    });
    const { result } = renderHook(() => useAddScopeItem('proj-1'), {
      wrapper,
    });

    result.current.mutate({
      title: 'Đăng nhập',
      description: 'Đăng nhập bằng SSO',
      version: 2,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(scopeApi.addItem).toHaveBeenCalledWith('proj-1', {
      title: 'Đăng nhập',
      description: 'Đăng nhập bằng SSO',
      version: 2,
    });
  });
});

describe('useUpdateScopeItem', () => {
  it('nên gọi scopeApi.updateItem với đúng hạng mục, trạng thái và phiên bản', async () => {
    vi.mocked(scopeApi.updateItem).mockResolvedValue({
      projectId: 'proj-1',
      rawDocument: null,
      version: 3,
      items: [],
    });
    const { result } = renderHook(() => useUpdateScopeItem('proj-1'), {
      wrapper,
    });

    result.current.mutate({
      itemId: 'item-1',
      input: { status: 'PHASE_2', version: 2 },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(scopeApi.updateItem).toHaveBeenCalledWith('proj-1', 'item-1', {
      status: 'PHASE_2',
      version: 2,
    });
  });
});
