import type { ReactNode } from 'react';
import { createElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { sessionKeys } from '@/services/keys';
import {
  useSessions,
  useRevokeSession,
  useRevokeOtherSessions,
} from './use-sessions';
import type { UserSessionInfo } from '../types';

// Mock lớp transport — test chỉ quan tâm hook gọi đúng method + invalidate cache.
vi.mock('@/services/sessions.api', () => ({
  sessionsApi: {
    list: vi.fn(),
    revoke: vi.fn(),
    revokeOthers: vi.fn(),
  },
}));

import { sessionsApi } from '@/services/sessions.api';

const mockList = vi.mocked(sessionsApi.list);
const mockRevoke = vi.mocked(sessionsApi.revoke);
const mockRevokeOthers = vi.mocked(sessionsApi.revokeOthers);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return { queryClient, Wrapper };
}

const fakeSessions: UserSessionInfo[] = [
  {
    sessionId: 's_1',
    deviceType: 'WEB',
    deviceName: 'Chrome trên Windows',
    ipAddress: '1.2.3.4',
    userAgent: 'ua',
    createdAt: '2026-06-15T00:00:00.000Z',
    lastSeenAt: '2026-06-15T01:00:00.000Z',
    current: true,
  },
];

describe('use-sessions hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useSessions gọi sessionsApi.list và trả về data', async () => {
    mockList.mockResolvedValue(fakeSessions);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useSessions(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockList).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(fakeSessions);
  });

  it('useRevokeSession gọi sessionsApi.revoke(sessionId) và invalidate list', async () => {
    mockRevoke.mockResolvedValue(undefined);
    const { queryClient, Wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRevokeSession(), {
      wrapper: Wrapper,
    });

    result.current.mutate('s_42');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRevoke).toHaveBeenCalledWith('s_42');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sessionKeys.list() });
  });

  it('useRevokeOtherSessions gọi sessionsApi.revokeOthers và invalidate list', async () => {
    mockRevokeOthers.mockResolvedValue(undefined);
    const { queryClient, Wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRevokeOtherSessions(), {
      wrapper: Wrapper,
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRevokeOthers).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sessionKeys.list() });
  });
});
