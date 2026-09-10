import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { aiApi } from './ai.api';

function createStreamResponse(events: string): Response {
  return new Response(events, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('AI API streaming transport', () => {
  beforeEach(() => {
    postStream.mockReset();
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
});
