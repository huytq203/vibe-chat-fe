import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Message, ShareContactTarget } from '@/features/chat/types';

const { createDirect, forward } = vi.hoisted(() => ({
  createDirect: vi.fn(),
  forward: vi.fn().mockResolvedValue({
    success: [{ conversationId: 'x', message: {} }],
    failed: [],
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock('@/services/chat-message.api', () => ({
  messageApi: { forward: (...args: unknown[]) => forward(...args) },
}));
vi.mock('@/services/chat.api', () => ({
  chatApi: { createDirect: (...args: unknown[]) => createDirect(...args) },
}));

import { useForwardMessage } from './useForwardMessage';

describe('useForwardMessage', () => {
  it('nên gửi 1 request forward gồm cả conversationIds lẫn userIds, không gọi createDirect', async () => {
    const message = { id: 'm1', conversationId: 'c1' } as Message;
    const targets: ShareContactTarget[] = [
      { type: 'friend', userId: 'u1' },
      { type: 'group', conversationId: 'g1' },
    ];
    const { result } = renderHook(() => useForwardMessage(message));

    await act(() => result.current.forward(targets));

    expect(createDirect).not.toHaveBeenCalled();
    expect(forward).toHaveBeenCalledWith('c1', 'm1', {
      conversationIds: ['g1'],
      userIds: ['u1'],
    });
  });
});
