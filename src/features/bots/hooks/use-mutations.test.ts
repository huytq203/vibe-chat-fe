import type { ReactNode } from 'react';
import { createElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreateBot, useUpdateBot, useDeleteBot } from './use-mutations';
import type { Bot, BotCreated } from '../types';

vi.mock('@/services/bots.api', () => ({
  botsApi: { create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

import { botsApi } from '@/services/bots.api';

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
