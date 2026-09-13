import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoreMessage } from '@/features/my-store/types';
import { useSendStoreMediaMessage } from './use-message-mutations';

const mocks = vi.hoisted(() => ({
  sendMessage: vi.fn(),
  prependMessage: vi.fn(),
  invalidateStoreUsage: vi.fn(),
}));

vi.mock('@/services/my-store.api', () => ({
  myStoreApi: { sendMessage: mocks.sendMessage },
}));

vi.mock('./store-mutation-helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./store-mutation-helpers')>();
  return {
    ...actual,
    prependMessage: mocks.prependMessage,
    invalidateStoreUsage: mocks.invalidateStoreUsage,
  };
});

function message(): StoreMessage {
  return {
    id: 'message-1',
    conversationId: 'store-1',
    senderId: 'me',
    type: 'IMAGE',
    plaintext: null,
    metadata: null,
    isDeleted: false,
    createdAt: '2026-09-13T12:00:00.000Z',
    updatedAt: '2026-09-13T12:00:00.000Z',
  };
}

describe('useSendStoreMediaMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendMessage.mockResolvedValue(message());
  });

  it('sends uploaded images in one message', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useSendStoreMediaMessage(), { wrapper });

    await act(() => result.current.mutateAsync({
      attachments: [
        { mediaId: 'media-1', kind: 'image' },
        { mediaId: 'media-2', kind: 'image' },
      ],
    }));

    expect(mocks.sendMessage).toHaveBeenCalledTimes(1);
    expect(mocks.sendMessage).toHaveBeenCalledWith({
      type: 'IMAGE',
      attachmentIds: ['media-1', 'media-2'],
    });
  });
});
