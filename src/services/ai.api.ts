import { ApiError, apiClient } from '@/lib/api/client';
import { readSseEvents } from '@/lib/api/sse';

export type AiChatMessage = { role: 'user' | 'assistant'; content: string };

export type AiChatContext = {
  today?: string;
  timezone?: string;
  projectId?: string;
  workspaceId?: string;
  pageId?: string;
  /** App đang chat — BE ghi origin theo đây (app task chưa chọn project vẫn là TASKS). */
  app?: 'TASKS' | 'NOTES' | 'CHAT';
};

/**
 * Phần duy nhất của attachment mà BE nhận. Nhận cả `AiAttachment` (còn base64,
 * lượt gửi đầu) lẫn `AiAttachmentMeta` đã lưu trong phiên (lượt gửi lại).
 */
export type AiAttachmentPayload = {
  name: string;
  mimeType: string;
  size: number;
  /** base64 (không kèm prefix `data:`). Thiếu → BE chỉ thấy tên tệp. */
  data?: string;
};

export type AiStreamOptions = {
  /** Gọi mỗi khi có thêm chữ — dùng để vẽ dần lên UI. */
  onDelta: (text: string) => void;
  onTool?: (name: string) => void;
  onDone?: (result: { conversationId: string }) => void;
  signal?: AbortSignal;
};

export type AiChatResult = { content: string; conversationId: string };

export type EstimateGemInput = {
  title: string;
  description?: string;
};

export type EstimateGemResult = {
  gem: number | null;
  reason: string;
};

/**
 * BE chưa có endpoint stream / proxy nuốt SSE. Chỉ những status này mới đáng
 * fallback về endpoint JSON — 429 hay 503 là lỗi thật, gọi lại chỉ tốn thêm lượt.
 */
const FALLBACK_STATUSES = new Set([404, 405, 501, 502, 504]);

/**
 * Gửi kèm base64 để model đọc được ảnh/tệp thật. Route `/api/v1/ai` của ai-service
 * đã nới body limit riêng cho việc này; các route khác vẫn giữ mức mặc định.
 * Tệp đã mất `data` (vd gửi lại sau khi tải lại trang) chỉ còn tên — BE tự xử lý.
 */
function buildBody(
  messages: AiChatMessage[],
  attachments?: readonly AiAttachmentPayload[],
  context?: AiChatContext,
  conversationId?: string,
): Record<string, unknown> {
  return {
    // Strip field thừa của AiMessage (vd `attachments` dạng meta của UI, `status`)
    // — BE bật forbidNonWhitelisted nên payload dư field sẽ bị 400.
    messages: messages.map(({ role, content }) => ({ role, content })),
    ...(attachments?.length
      ? {
          attachments: attachments.map(({ name, mimeType, size, data }) => ({
            name,
            mimeType,
            size,
            ...(data ? { data } : {}),
          })),
        }
      : {}),
    ...(context ? { context } : {}),
    ...(conversationId ? { conversationId } : {}),
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

async function requestChat(
  messages: AiChatMessage[],
  attachments?: readonly AiAttachmentPayload[],
  context?: AiChatContext,
  conversationId?: string,
): Promise<AiChatResult> {
  return apiClient.post<AiChatResult>('/api/v1/ai/chat', {
    body: buildBody(messages, attachments, context, conversationId),
    service: 'ai' as never,
  });
}

function chat(
  messages: AiChatMessage[],
  attachments: readonly AiAttachmentPayload[] | undefined,
  context: AiChatContext | undefined,
  conversationId: string | undefined,
): Promise<AiChatResult>;
function chat(
  messages: AiChatMessage[],
  attachments?: readonly AiAttachmentPayload[],
  context?: AiChatContext,
): Promise<string>;
async function chat(
  messages: AiChatMessage[],
  attachments?: readonly AiAttachmentPayload[],
  context?: AiChatContext,
  conversationId?: string,
): Promise<string | AiChatResult> {
  const result = await requestChat(messages, attachments, context, conversationId);
  return arguments.length >= 4 ? result : result.content;
}

/**
 * Lượt tiện ích một lần (sinh tiêu đề, tóm tắt nhanh…) — `persist:false` để BE
 * không tạo hội thoại "ma" trong lịch sử người dùng.
 */
async function completeOnce(messages: AiChatMessage[]): Promise<string> {
  const result = await apiClient.post<AiChatResult>('/api/v1/ai/chat', {
    body: { ...buildBody(messages), persist: false },
    service: 'ai' as never,
  });
  return result.content;
}

async function consume(
  response: Response,
  onDelta: (text: string) => void,
  onTool?: (name: string) => void,
  onDone?: (result: { conversationId: string }) => void,
): Promise<string> {
  const body = response.body;
  if (!body) throw new ApiError(502, 'AI_STREAM_FAILED', 'Trợ lý AI không trả về nội dung');

  let content = '';
  for await (const { event, data } of readSseEvents(body)) {
    if (event === 'delta') {
      const text = readField(data, 'text');
      if (!text) continue;
      content += text;
      onDelta(text);
      continue;
    }
    if (event === 'tool') {
      const name = readField(data, 'name');
      if (name) onTool?.(name);
      continue;
    }
    if (event === 'done') {
      const conversationId = readField(data, 'conversationId');
      if (conversationId) onDone?.({ conversationId });
      return content;
    }
    if (event === 'error') {
      throw new ApiError(
        502,
        'AI_STREAM_FAILED',
        readField(data, 'message') || 'Trợ lý AI gặp sự cố khi trả lời',
      );
    }
  }

  // Đóng mà không có `done`/`error` = kết nối đứt giữa chừng.
  throw new ApiError(
    0,
    'AI_STREAM_INTERRUPTED',
    'Kết nối bị ngắt giữa chừng, câu trả lời chưa hoàn chỉnh',
  );
}

/**
 * REST endpoint AI của ai-service. Pure transport.
 * FE không giữ API key AI — ai-service gọi provider bằng key nó tự quản lý.
 */
export const aiApi = {
  chat,
  completeOnce,

  estimateGem: (input: EstimateGemInput) =>
    apiClient.post<EstimateGemResult>('/api/v1/ai/tasks/estimate-gem', {
      body: input,
      service: 'ai' as never,
    }),

  /**
   * Bản streaming: bắn từng mẩu chữ qua `onDelta`, trả về nội dung đầy đủ khi xong.
   * Nếu BE chưa có endpoint stream thì tự lùi về `chat` và phát nguyên câu trả lời
   * thành một mẩu — deploy FE trước BE vẫn dùng được, chỉ mất hiệu ứng gõ dần.
   */
  chatStream: async (
    messages: AiChatMessage[],
    attachments: readonly AiAttachmentPayload[] | undefined,
    { onDelta, onTool, onDone, signal }: AiStreamOptions,
    context?: AiChatContext,
    conversationId?: string,
  ): Promise<string> => {
    let response: Response;
    try {
      response = await apiClient.postStream('/api/v1/ai/chat/stream', {
        body: buildBody(messages, attachments, context, conversationId),
        headers: { Accept: 'text/event-stream' },
        signal,
        service: 'ai' as never,
      });
    } catch (error) {
      if (!(error instanceof ApiError) || !FALLBACK_STATUSES.has(error.status)) throw error;
      const result = await requestChat(messages, attachments, context, conversationId);
      onDelta(result.content);
      onDone?.({ conversationId: result.conversationId });
      return result.content;
    }

    return consume(response, onDelta, onTool, onDone);
  },

  getConfig: () => apiClient.get<{ model: string }>('/api/v1/ai/config'),
} as const;
