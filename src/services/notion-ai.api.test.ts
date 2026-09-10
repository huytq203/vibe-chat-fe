import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AiMessage } from '@/features/ai';

const { postStream } = vi.hoisted(() => ({ postStream: vi.fn() }));

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      postStream,
    },
  };
});

import { notionAiApi } from '@/services/notion-ai.api';

function createStreamResponse(events: string): Response {
  return new Response(events, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('Notion AI API streaming transport', () => {
  beforeEach(() => {
    postStream.mockReset();
  });

  it('nên gửi đúng ngữ cảnh và lược field UI khi gọi hội thoại notion', async () => {
    postStream.mockResolvedValue(createStreamResponse('event: done\ndata: {}\n\n'));
    const messages: AiMessage[] = [
      {
        role: 'user',
        content: 'Đọc trang',
        attachments: [{ name: 'ghi-chu.txt', mimeType: 'text/plain', size: 8 }],
        status: 'failed',
        errorMessage: 'Lỗi cũ',
      },
    ];

    await notionAiApi.chatStream(
      messages,
      { workspaceId: 'workspace-1', pageId: 'page-1' },
      { onDelta: vi.fn() },
    );

    expect(postStream).toHaveBeenCalledWith('/api/v1/ai/notion/chat/stream', {
      body: {
        messages: [{ role: 'user', content: 'Đọc trang' }],
        workspaceId: 'workspace-1',
        pageId: 'page-1',
      },
      headers: { Accept: 'text/event-stream' },
      signal: undefined,
    });
  });

  it('nên gom delta và gọi callback khi luồng hoàn tất', async () => {
    postStream.mockResolvedValue(
      createStreamResponse(
        'event: delta\ndata: {"text":"Xin "}\n\nevent: delta\ndata: {"text":"chào"}\n\nevent: done\ndata: {}\n\n',
      ),
    );
    const onDelta = vi.fn();

    const content = await notionAiApi.chatStream(
      [{ role: 'user', content: 'Chào' }],
      { workspaceId: 'workspace-1' },
      { onDelta },
    );

    expect(content).toBe('Xin chào');
    expect(onDelta).toHaveBeenNthCalledWith(1, 'Xin ');
    expect(onDelta).toHaveBeenNthCalledWith(2, 'chào');
  });

  it('nên gọi onTool khi luồng SSE có event tool', async () => {
    postStream.mockResolvedValue(
      createStreamResponse('event: tool\ndata: {"name":"read_page"}\n\nevent: done\ndata: {}\n\n'),
    );
    const onTool = vi.fn();

    await notionAiApi.chatStream(
      [{ role: 'user', content: 'Đọc trang' }],
      { workspaceId: 'workspace-1' },
      { onDelta: vi.fn(), onTool },
    );

    expect(onTool).toHaveBeenCalledOnce();
    expect(onTool).toHaveBeenCalledWith('read_page');
  });

  it('nên ném ApiError khi luồng phát event error', async () => {
    postStream.mockResolvedValue(
      createStreamResponse('event: error\ndata: {"message":"Không đọc được trang"}\n\n'),
    );

    await expect(
      notionAiApi.chatStream(
        [{ role: 'user', content: 'Đọc trang' }],
        { workspaceId: 'workspace-1' },
        { onDelta: vi.fn() },
      ),
    ).rejects.toMatchObject({
      status: 502,
      code: 'AI_STREAM_FAILED',
      message: 'Không đọc được trang',
    });
  });

  it('nên ném lỗi interrupted khi luồng đóng mà chưa có done', async () => {
    postStream.mockResolvedValue(
      createStreamResponse('event: delta\ndata: {"text":"Dở dang"}\n\n'),
    );

    await expect(
      notionAiApi.chatStream(
        [{ role: 'user', content: 'Đọc trang' }],
        { workspaceId: 'workspace-1' },
        { onDelta: vi.fn() },
      ),
    ).rejects.toMatchObject({ status: 0, code: 'AI_STREAM_INTERRUPTED' });
  });
});
