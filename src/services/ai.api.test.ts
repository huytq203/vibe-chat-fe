import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, postStream } = vi.hoisted(() => ({ post: vi.fn(), postStream: vi.fn() }));

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      post,
      postStream,
    },
  };
});

import { aiApi } from './ai.api';

function createStreamResponse(events: string): Response {
  return new Response(events, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('AI API streaming transport', () => {
  beforeEach(() => {
    post.mockReset();
    postStream.mockReset();
  });

  it('gửi conversationId và trả về dữ liệu hội thoại từ API JSON', async () => {
    post.mockResolvedValue({ content: 'Đã xong', conversationId: 'conversation-1' });

    await expect(aiApi.chat(
      [{ role: 'user', content: 'Tiếp tục' }],
      undefined,
      undefined,
      'conversation-1',
    )).resolves.toEqual({ content: 'Đã xong', conversationId: 'conversation-1' });
    expect(post).toHaveBeenCalledWith('/api/v1/ai/chat', expect.objectContaining({
      body: expect.objectContaining({ conversationId: 'conversation-1' }),
    }));
  });

  it('gửi payload phân tích tới ai-service và kiểm tra response', async () => {
    const result = {
      classification: 'TASK',
      scopeStatus: 'IN_SCOPE',
      summary: 'Cần cập nhật trang thanh toán.',
      reasoning: 'Tin nhắn mô tả một đầu việc cụ thể.',
      confidence: 0.92,
      clarifyingQuestion: null,
      suggestedActions: [],
      source: {
        conversationId: '11111111-1111-4111-8111-111111111111',
        messageIds: ['22222222-2222-4222-8222-222222222222'],
      },
    };
    post.mockResolvedValue(result);

    await expect(aiApi.analyze({
      projectId: 'project-1',
      conversationId: result.source.conversationId,
      messages: [{
        uuid: result.source.messageIds[0],
        senderId: 'user-1',
        previewText: 'Cập nhật trang thanh toán',
        createdAt: '2026-09-21T08:00:00.000Z',
      }],
    })).resolves.toEqual(result);

    expect(post).toHaveBeenCalledWith('/api/v1/ai/analyze', {
      body: expect.objectContaining({ projectId: 'project-1' }),
      service: 'ai',
    });
  });

  it('calls onTool with the tool name when the stream contains a tool event', async () => {
    postStream.mockResolvedValue(
      createStreamResponse('event: tool\ndata: {"name":"read_page"}\n\nevent: done\ndata: {}\n\n'),
    );
    const onTool = vi.fn();

    await aiApi.chatStream([{ role: 'user', content: 'Read this page' }], undefined, {
      onDelta: vi.fn(),
      onTool,
    });

    expect(onTool).toHaveBeenCalledOnce();
    expect(onTool).toHaveBeenCalledWith('read_page');
  });

  it('ignores a tool event when onTool is not provided', async () => {
    postStream.mockResolvedValue(
      createStreamResponse('event: tool\ndata: {"name":"read_page"}\n\nevent: done\ndata: {}\n\n'),
    );

    await expect(
      aiApi.chatStream([{ role: 'user', content: 'Read this page' }], undefined, {
        onDelta: vi.fn(),
      }),
    ).resolves.toBe('');
  });

  it('gửi conversationId và báo ID từ sự kiện done', async () => {
    postStream.mockResolvedValue(createStreamResponse(
      'event: delta\ndata: {"text":"Xong"}\n\nevent: done\ndata: {"conversationId":"conversation-2"}\n\n',
    ));
    const onDone = vi.fn();

    await aiApi.chatStream(
      [{ role: 'user', content: 'Tiếp tục' }],
      undefined,
      { onDelta: vi.fn(), onDone },
      undefined,
      'conversation-1',
    );

    expect(postStream).toHaveBeenCalledWith('/api/v1/ai/chat/stream', expect.objectContaining({
      body: expect.objectContaining({ conversationId: 'conversation-1' }),
    }));
    expect(onDone).toHaveBeenCalledWith({ conversationId: 'conversation-2' });
  });
});
