import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clientApi } from '../services/client.api';
import { tasksApi } from '../services/tasks.api';
import { taskKeys } from '../services/keys';
import { toast } from 'sonner';
import { useAddContact, useInviteClientContact, useUpsertClient } from './useClient';

vi.mock('../services/tasks.api', () => ({ tasksApi: { addMember: vi.fn() } }));

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

describe('useInviteClientContact', () => {
  it('nên gửi addMember với role CLIENT và contactId rồi tải lại client và members', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    vi.mocked(tasksApi.addMember).mockResolvedValue({} as Awaited<ReturnType<typeof tasksApi.addMember>>);
    const { result } = renderHook(() => useInviteClientContact('proj-1'), {
      wrapper: ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children),
    });

    result.current.mutate({ userId: 'user-2', contactId: 'c1' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(tasksApi.addMember).toHaveBeenCalledWith('proj-1', 'user-2', { role: 'CLIENT', contactId: 'c1' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: taskKeys.client('proj-1') });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['tasks', 'proj-1', 'members'] });
  });

  it('nên hiện thông báo và tải lại khi contact đã được liên kết', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    vi.mocked(tasksApi.addMember).mockRejectedValue(Object.assign(new Error('Conflict'), { code: 'CLIENT_CONTACT_ALREADY_LINKED' }));
    const { result } = renderHook(() => useInviteClientContact('proj-1'), {
      wrapper: ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children),
    });

    result.current.mutate({ userId: 'user-2', contactId: 'c1' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('Người liên hệ đã được gắn với tài khoản khác');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: taskKeys.client('proj-1') });
  });
});
