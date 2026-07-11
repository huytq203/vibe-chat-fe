import type { ReactNode } from 'react';
import { createElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useCreateBot,
  useUpdateBot,
  useDeleteBot,
  useIssueToken,
  useRotateToken,
  useRevokeToken,
} from './use-mutations';
import type { Bot, BotCreated, BotTokenIssued } from '../types';

vi.mock('@/services/bots.api', () => ({
  botsApi: { create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

vi.mock('@/services/bot-tokens.api', () => ({
  botTokensApi: { issue: vi.fn(), rotate: vi.fn(), revoke: vi.fn() },
}));

import { botsApi } from '@/services/bots.api';
import { botTokensApi } from '@/services/bot-tokens.api';

const mockCreate = vi.mocked(botsApi.create);
const mockUpdate = vi.mocked(botsApi.update);
const mockRemove = vi.mocked(botsApi.remove);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return { Wrapper, invalidateSpy };
}

const BOT: Bot = {
  id: 'bot-1',
  username: 'weather_bot',
  displayName: 'Weather Bot',
  status: 'ACTIVE',
  provisioned: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const CREATED: BotCreated = {
  bot: BOT,
  token: {
    id: 'token-1',
    token: 'bot-1:secret',
    prefix: 'secret',
    scopes: ['messages:send'],
    createdAt: '2026-01-01T00:00:00.000Z',
  },
};

describe('bots mutation hooks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('useCreateBot gọi botsApi.create và invalidate botKeys.all khi thành công', async () => {
    mockCreate.mockResolvedValue(CREATED);
    const { Wrapper, invalidateSpy } = createWrapper();
    const { result } = renderHook(() => useCreateBot(), { wrapper: Wrapper });

    result.current.mutate({ username: 'weather_bot', displayName: 'Weather Bot' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCreate).toHaveBeenCalledWith({
      username: 'weather_bot',
      displayName: 'Weather Bot',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['bots'] });
  });

  it('useUpdateBot gọi botsApi.update với đúng botId', async () => {
    mockUpdate.mockResolvedValue(BOT);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateBot('bot-1'), { wrapper: Wrapper });

    result.current.mutate({ displayName: 'New Name' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpdate).toHaveBeenCalledWith('bot-1', { displayName: 'New Name' });
  });

  it('useDeleteBot gọi botsApi.remove với botId', async () => {
    mockRemove.mockResolvedValue(undefined);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDeleteBot(), { wrapper: Wrapper });

    result.current.mutate('bot-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRemove).toHaveBeenCalledWith('bot-1');
  });
});

const ISSUED: BotTokenIssued = {
  id: 'token-2',
  token: 'bot-1:secret2',
  prefix: 'secret2',
  scopes: ['messages:send'],
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('token mutation hooks', () => {
  const mockIssue = vi.mocked(botTokensApi.issue);
  const mockRotate = vi.mocked(botTokensApi.rotate);
  const mockRevoke = vi.mocked(botTokensApi.revoke);
  beforeEach(() => vi.clearAllMocks());

  it('useIssueToken gọi botTokensApi.issue với đúng botId + input', async () => {
    mockIssue.mockResolvedValue(ISSUED);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useIssueToken('bot-1'), { wrapper: Wrapper });

    result.current.mutate({ scopes: ['messages:send'] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockIssue).toHaveBeenCalledWith('bot-1', { scopes: ['messages:send'] });
  });

  it('useRotateToken gọi botTokensApi.rotate với đúng tokenId', async () => {
    mockRotate.mockResolvedValue(ISSUED);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRotateToken('bot-1'), { wrapper: Wrapper });

    result.current.mutate({ tokenId: 'token-1', input: {} });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRotate).toHaveBeenCalledWith('bot-1', 'token-1', {});
  });

  it('useRevokeToken gọi botTokensApi.revoke với đúng tokenId', async () => {
    mockRevoke.mockResolvedValue(undefined);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRevokeToken('bot-1'), { wrapper: Wrapper });

    result.current.mutate('token-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRevoke).toHaveBeenCalledWith('bot-1', 'token-1');
  });
});
