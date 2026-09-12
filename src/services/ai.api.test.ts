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
