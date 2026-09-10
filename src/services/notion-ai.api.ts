import { ApiError, apiClient } from '@/lib/api/client';
import { readSseEvents } from '@/lib/api/sse';
import type { AiChatMessage, AiStreamOptions } from '@/services/ai.api';

type NotionAiContext = {
  workspaceId: string;
  pageId?: string;
};

function buildBody(
  messages: AiChatMessage[],
  { workspaceId, pageId }: NotionAiContext,
): Record<string, unknown> {
  return {
    // Lược field chỉ thuộc UI vì backend từ chối thuộc tính ngoài DTO.
    messages: messages.map(({ role, content }) => ({ role, content })),
    workspaceId,
    ...(pageId ? { pageId } : {}),
  };
}

function readField(data: string, field: string): string {
  try {
    const parsed = JSON.parse(data) as Record<string, unknown>;
    const value = parsed[field];
    return typeof value === 'string' ? value : '';
  } catch {
    return '';
  }
}

async function consume(response: Response, options: AiStreamOptions): Promise<string> {
  const body = response.body;
  if (!body) throw new ApiError(502, 'AI_STREAM_FAILED', 'Trợ lý AI không trả về nội dung');

  let content = '';
  for await (const { event, data } of readSseEvents(body)) {
    if (event === 'delta') {
      const text = readField(data, 'text');
      if (!text) continue;
      content += text;
      options.onDelta(text);
      continue;
    }
    if (event === 'tool') {
      const name = readField(data, 'name');
      if (name) options.onTool?.(name);
      continue;
    }
    if (event === 'done') return content;
    if (event === 'error') {
      throw new ApiError(
        502,
        'AI_STREAM_FAILED',
        readField(data, 'message') || 'Trợ lý AI gặp sự cố khi trả lời',
      );
    }
  }

  throw new ApiError(
    0,
    'AI_STREAM_INTERRUPTED',
    'Kết nối bị ngắt giữa chừng, câu trả lời chưa hoàn chỉnh',
  );
}

export const notionAiApi = {
  chatStream: async (
    messages: AiChatMessage[],
    context: NotionAiContext,
    options: AiStreamOptions,
  ): Promise<string> => {
    const response = await apiClient.postStream('/api/v1/ai/notion/chat/stream', {
      body: buildBody(messages, context),
      headers: { Accept: 'text/event-stream' },
      signal: options.signal,
    });

    return consume(response, options);
  },
} as const;
