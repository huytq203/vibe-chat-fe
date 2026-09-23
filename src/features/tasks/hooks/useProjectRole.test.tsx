import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tasksApi } from '../services/tasks.api';
import { getCurrentUser } from '../lib/current-user';
import type { Member } from '../types';
import { useProjectRole } from './useProjectRole';

vi.mock('../services/tasks.api', () => ({
  tasksApi: { listMembers: vi.fn() },
}));
vi.mock('../lib/current-user', () => ({ getCurrentUser: vi.fn() }));

const projectId = 'proj-1';
const currentUser = { userId: 'user-1', displayName: 'Người dùng', avatarUrl: null };

function member(role: Member['role'], userId = currentUser.userId): Member {
  return {
    userId,
    projectId,
    role,
    displayName: 'Người dùng',
    avatarUrl: null,
    joinedAt: '2026-09-23T00:00:00.000Z',
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockReturnValue(currentUser);
});

describe('Vai trò trong dự án', () => {
  it('nên trả canManage khi user là OWNER', async () => {
    vi.mocked(tasksApi.listMembers).mockResolvedValue([member('OWNER')]);
    const { result } = renderHook(() => useProjectRole(projectId), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toEqual({ role: 'OWNER', isClient: false, canManage: true, isLoading: false });
  });

  it('nên trả canManage khi user là ADMIN', async () => {
    vi.mocked(tasksApi.listMembers).mockResolvedValue([member('ADMIN')]);
    const { result } = renderHook(() => useProjectRole(projectId), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toEqual({ role: 'ADMIN', isClient: false, canManage: true, isLoading: false });
  });

  it('nên trả isClient và không canManage khi user là CLIENT', async () => {
    vi.mocked(tasksApi.listMembers).mockResolvedValue([member('CLIENT')]);
    const { result } = renderHook(() => useProjectRole(projectId), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toEqual({ role: 'CLIENT', isClient: true, canManage: false, isLoading: false });
  });

  it('nên trả role null và không canManage khi user không phải member', async () => {
    vi.mocked(tasksApi.listMembers).mockResolvedValue([member('OWNER', 'user-2')]);
    const { result } = renderHook(() => useProjectRole(projectId), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toEqual({ role: null, isClient: false, canManage: false, isLoading: false });
  });

  it('nên trả isLoading khi danh sách member đang tải', () => {
    vi.mocked(tasksApi.listMembers).mockReturnValue(new Promise<Member[]>(() => {}));
    const { result } = renderHook(() => useProjectRole(projectId), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.role).toBeNull();
  });
});
