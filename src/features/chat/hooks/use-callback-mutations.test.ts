import type { ReactNode } from 'react';
import { createElement } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { botKeys } from '@/services/keys';
import { chatApi } from '@/services/chat.api';
import { useCreateCallback } from './use-callback-mutations';

vi.mock('@/services/chat.api', () => ({
  chatApi: { createCallback: vi.fn() },
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const createCallback = vi.mocked(chatApi.createCallback);

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return { Wrapper, invalidate };
}

describe('useCreateCallback', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refresh danh sách bot sau khi accept transfer', async () => {
    createCallback.mockResolvedValue({} as never);
    const { Wrapper, invalidate } = setup();
    const { result } = renderHook(() => useCreateCallback(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        conversationId: 'conv-1',
        messageId: 'msg-1',
        callbackData: 'bf:transfer:accept:bot-1',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: botKeys.all });
  });

  it('không refresh bot cho callback thông thường', async () => {
    createCallback.mockResolvedValue({} as never);
    const { Wrapper, invalidate } = setup();
    const { result } = renderHook(() => useCreateCallback(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        conversationId: 'conv-1',
        messageId: 'msg-1',
        callbackData: 'poll:vote:1',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: botKeys.all });
  });
});
