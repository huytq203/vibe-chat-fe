import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import type { MutableRefObject } from 'react';
import { chatKeys } from '@/services/keys';
import type { Message, MessagesPage } from '@/features/chat/types';
import { makeOnReconnectCatchUp } from './chat-realtime-reconnect';
import type { RealtimeHandlerDeps } from './chat-realtime-cache';

function msg(id: string, plaintext: string): Message {
  return {
    id,
    conversationId: 'c1',
    senderId: 'other',
    type: 'TEXT',
    encryptionType: 'NONE',
    plaintext,
    attachments: [],
    contentPreview: plaintext,
    metadata: null,
    replyToMessageId: null,
    isEdited: false,
    isDeleted: false,
    isView: false,
    createdAt: '2026-09-16T00:00:00.000Z',
  };
}

describe('makeOnReconnectCatchUp', () => {
  it('nên invalidate list + presence và upsert trang mới nhất của conv đang mở, KHÔNG invalidate messages', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    const upsertMessage = vi.fn().mockReturnValue(true);
    const joinedRef = { current: 'c1' } as MutableRefObject<string | null>;
    const deps = { qc, joinedRef, upsertMessage } as unknown as RealtimeHandlerDeps;
    const page: MessagesPage = {
      items: [msg('m2', 'b'), msg('m1', 'a')],
      nextCursor: null,
    };
    const fetchLatest = vi.fn().mockResolvedValue(page);

    await makeOnReconnectCatchUp(deps, fetchLatest)();

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: chatKeys.conversationLists(),
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: chatKeys.presenceAll() });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: chatKeys.all });
    expect(fetchLatest).toHaveBeenCalledWith('c1');
    // upsert theo thứ tự cũ → mới để cache giữ đúng chiều thời gian.
    expect(upsertMessage.mock.calls.map((call) => (call[0] as Message).id)).toEqual([
      'm1',
      'm2',
    ]);
  });

  it('nên bỏ qua fetch tin khi không có conv đang mở', async () => {
    const qc = new QueryClient();
    const fetchLatest = vi.fn();
    const deps = {
      qc,
      joinedRef: { current: null },
      upsertMessage: vi.fn(),
    } as unknown as RealtimeHandlerDeps;

    await makeOnReconnectCatchUp(deps, fetchLatest)();

    expect(fetchLatest).not.toHaveBeenCalled();
  });
});
