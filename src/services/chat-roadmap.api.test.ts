import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/lib/api/client';
import { conversationApi } from './chat-conversation.api';
import { messageApi } from './chat-message.api';

vi.mock('@/lib/api/client', () => ({
  apiClient: { patch: vi.fn(), post: vi.fn(), rawWithMeta: vi.fn() },
}));

describe('P1/P2 API contracts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('gửi đúng archived filter và giữ meta archive', async () => {
    vi.mocked(apiClient.rawWithMeta).mockResolvedValue({ data: [{ id: 'conv-1' }], meta: { archived: 3 } } as never);
    const result = await conversationApi.listConversations({ page: 1, limit: 20, archived: true });
    expect(apiClient.rawWithMeta).toHaveBeenCalledWith('GET', '/api/v1/conversations', { query: { page: 1, limit: 20, archived: true } });
    expect(result.meta).toEqual({ archived: 3 });
  });

  it('không gửi archived=false khi lấy danh sách chính', async () => {
    vi.mocked(apiClient.rawWithMeta).mockResolvedValue({ data: [], meta: {} } as never);

    await conversationApi.listConversations({ page: 1, limit: 30, archived: false });

    expect(apiClient.rawWithMeta).toHaveBeenCalledWith('GET', '/api/v1/conversations', {
      query: { page: 1, limit: 30 },
    });
  });

  it('archive dùng PATCH endpoint và body đúng contract', async () => {
    await conversationApi.setArchived('conv-1', true);
    expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/conversations/conv-1/archive', { body: { archived: true } });
  });

  it('forward gửi một request cho nhiều target', async () => {
    await messageApi.forward('source', 'message-1', ['target-1', 'target-2']);
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/conversations/source/messages/message-1/forward', { body: { targetConversationIds: ['target-1', 'target-2'] } });
  });
});
