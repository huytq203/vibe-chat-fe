import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clientApi } from '../services/client.api';
import { useAddContact, useUpsertClient } from './useClient';

vi.mock('../services/client.api', () => ({
  clientApi: {
    get: vi.fn(),
    upsert: vi.fn(),
    addContact: vi.fn(),
    updateContact: vi.fn(),
    removeContact: vi.fn(),
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

describe('useUpsertClient', () => {
  it('nên gọi clientApi.upsert với đúng tham số', async () => {
    vi.mocked(clientApi.upsert).mockResolvedValue({
      projectId: 'proj-1',
      name: 'ACME',
      contacts: [],
    });
    const { result } = renderHook(() => useUpsertClient('proj-1'), {
      wrapper,
    });

    result.current.mutate('ACME');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(clientApi.upsert).toHaveBeenCalledWith('proj-1', 'ACME');
  });
});

describe('useAddContact', () => {
  it('nên gọi clientApi.addContact với đúng tham số', async () => {
    vi.mocked(clientApi.addContact).mockResolvedValue({
      id: 'c1',
      userId: null,
      name: 'Alex',
      email: null,
      title: null,
      isPrimary: false,
      isDeleted: false,
    });
    const { result } = renderHook(() => useAddContact('proj-1'), {
      wrapper,
    });

    result.current.mutate({ name: 'Alex' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(clientApi.addContact).toHaveBeenCalledWith('proj-1', {
      name: 'Alex',
    });
  });
});
