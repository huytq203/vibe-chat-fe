import type { ReactNode } from 'react';
import { createElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBots, useBotTokens } from './use-query';
import type { BotListPage, BotTokenListItem } from '../types';

vi.mock('@/services/bots.api', () => ({
  botsApi: { list: vi.fn() },
}));

vi.mock('@/services/bot-tokens.api', () => ({
  botTokensApi: { list: vi.fn() },
}));

import { botsApi } from '@/services/bots.api';
import { botTokensApi } from '@/services/bot-tokens.api';

const mockList = vi.mocked(botsApi.list);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return Wrapper;
}

const PAGE: BotListPage = {
  items: [
    {
      id: 'bot-1',
      username: 'weather_bot',
      displayName: 'Weather Bot',
      status: 'ACTIVE',
      provisioned: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  page: 1,
  limit: 20,
  total: 1,
  totalPages: 1,
};

describe('useBots', () => {
  beforeEach(() => vi.clearAllMocks());

  it('gọi botsApi.list với đúng tham số và trả data', async () => {
    mockList.mockResolvedValue(PAGE);
    const { result } = renderHook(() => useBots({ page: 1, limit: 20 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockList).toHaveBeenCalledWith({ page: 1, limit: 20 });
    expect(result.current.data).toEqual(PAGE);
  });
});

describe('useBotTokens', () => {
  const mockTokenList = vi.mocked(botTokensApi.list);
  beforeEach(() => vi.clearAllMocks());

  it('gọi botTokensApi.list với đúng botId', async () => {
    const tokens: BotTokenListItem[] = [
      {
        id: 'token-1',
        prefix: 'abc123',
        scopes: ['messages:send'],
        expiresAt: null,
        lastUsedAt: null,
        revokedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    mockTokenList.mockResolvedValue(tokens);
    const { result } = renderHook(() => useBotTokens('bot-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockTokenList).toHaveBeenCalledWith('bot-1');
    expect(result.current.data).toEqual(tokens);
  });
});
