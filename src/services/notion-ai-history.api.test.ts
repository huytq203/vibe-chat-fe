import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ apiClient: client }));

import { notionAiHistoryApi } from '@/services/notion-ai-history.api';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('transport lịch sử AI của ghi chú', () => {
  it('nên đọc danh sách theo workspace khi mở lịch sử', async () => {
    client.get.mockResolvedValueOnce([
      { id: 'conversation-1', title: null, updatedAt: '2026-09-10T08:00:00.000Z' },
    ]).mockResolvedValueOnce({
      id: 'conversation-1', title: 'Tóm tắt', messages: [],
    });

    await notionAiHistoryApi.list('workspace-1');
    await notionAiHistoryApi.detail('conversation-1');

    expect(client.get).toHaveBeenNthCalledWith(
      1, '/api/v1/workspaces/workspace-1/ai-conversations', { service: 'notion' },
    );
    expect(client.get).toHaveBeenNthCalledWith(
      2, '/api/v1/ai-conversations/conversation-1', { service: 'notion' },
    );
  });

  it('nên gửi trang khởi tạo khi tạo hội thoại trong workspace', async () => {
    client.post.mockResolvedValueOnce({ id: 'conversation-1' })
      .mockResolvedValueOnce({ ok: true });
    client.patch.mockResolvedValue({ id: 'conversation-1', title: 'Tên mới' });
    client.delete.mockResolvedValue({ id: 'conversation-1' });
    const turn = {
      user: { role: 'user' as const, content: 'Câu hỏi' },
      assistant: { role: 'assistant' as const, content: 'Câu trả lời' },
    };

    await notionAiHistoryApi.create('workspace-1', 'page-1');
    await notionAiHistoryApi.appendTurn('conversation-1', turn);
    await notionAiHistoryApi.rename('conversation-1', 'Tên mới');
    await notionAiHistoryApi.remove('conversation-1');

    expect(client.post).toHaveBeenNthCalledWith(
      1, '/api/v1/workspaces/workspace-1/ai-conversations',
      { body: { pageId: 'page-1' }, service: 'notion' },
    );
    expect(client.post).toHaveBeenNthCalledWith(
      2, '/api/v1/ai-conversations/conversation-1/turns',
      { body: turn, service: 'notion' },
    );
    expect(client.patch).toHaveBeenCalledWith(
      '/api/v1/ai-conversations/conversation-1',
      { body: { title: 'Tên mới' }, service: 'notion' },
    );
    expect(client.delete).toHaveBeenCalledWith(
      '/api/v1/ai-conversations/conversation-1', { service: 'notion' },
    );
  });

  it('nên bỏ body pageId khi tạo hội thoại không gắn trang khởi tạo', async () => {
    client.post.mockResolvedValue({ id: 'conversation-1' });

    await notionAiHistoryApi.create('workspace-1');

    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/workspaces/workspace-1/ai-conversations',
      { body: undefined, service: 'notion' },
    );
  });

  it('nên gửi multipart qua service notion khi tải tệp', async () => {
    client.post.mockResolvedValue({ storageKey: 'ai-conversations/1/file',
      name: 'note.txt', mimeType: 'text/plain', size: 4 });
    const file = new File(['note'], 'note.txt', { type: 'text/plain' });

    await notionAiHistoryApi.uploadAttachment('conversation-1', file);

    const call = client.post.mock.calls[0];
    expect(call?.[0]).toBe('/api/v1/ai-conversations/conversation-1/attachments');
    expect(call?.[1]).toMatchObject({ service: 'notion' });
    expect(call?.[1]?.body).toBeInstanceOf(FormData);
    expect((call?.[1]?.body as FormData).get('file')).toBe(file);
  });
});
