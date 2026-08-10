import { ApiError, apiClient } from '@/lib/api/client';
import { readSseEvents } from '@/lib/api/sse';

export type AiChatMessage = { role: 'user' | 'assistant'; content: string };

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
  signal?: AbortSignal;
};

/**
 * BE chưa có endpoint stream / proxy nuốt SSE. Chỉ những status này mới đáng
 * fallback về endpoint JSON — 429 hay 503 là lỗi thật, gọi lại chỉ tốn thêm lượt.
 */
const FALLBACK_STATUSES = new Set([404, 405, 501, 502, 504]);

/**
 * Gửi kèm base64 để model đọc được ảnh/tệp thật. Route `/api/v1/ai` của bot-service
 * đã nới body limit riêng cho việc này; các route khác vẫn giữ mức mặc định.
 * Tệp đã mất `data` (vd gửi lại sau khi tải lại trang) chỉ còn tên — BE tự xử lý.
 */
function buildBody(
  messages: AiChatMessage[],
  attachments?: readonly AiAttachmentPayload[],
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

async function chat(
  messages: AiChatMessage[],
  attachments?: readonly AiAttachmentPayload[],
): Promise<string> {
  const { content } = await apiClient.post<{ content: string }>('/api/v1/ai/chat', {
    body: buildBody(messages, attachments),
  });
  return content;
}

async function consume(response: Response, onDelta: (text: string) => void): Promise<string> {
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
    if (event === 'done') return content;
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
 * REST endpoint AI của bot-service. Pure transport.
 * FE không giữ API key AI — bot-service gọi provider bằng key của nó.
 */
export const aiApi = {
  chat,

  /**
   * Bản streaming: bắn từng mẩu chữ qua `onDelta`, trả về nội dung đầy đủ khi xong.
   * Nếu BE chưa có endpoint stream thì tự lùi về `chat` và phát nguyên câu trả lời
   * thành một mẩu — deploy FE trước BE vẫn dùng được, chỉ mất hiệu ứng gõ dần.
   */
  chatStream: async (
    messages: AiChatMessage[],
    attachments: readonly AiAttachmentPayload[] | undefined,
    { onDelta, signal }: AiStreamOptions,
  ): Promise<string> => {
    let response: Response;
    try {
      response = await apiClient.postStream('/api/v1/ai/chat/stream', {
        body: buildBody(messages, attachments),
        headers: { Accept: 'text/event-stream' },
        signal,
      });
    } catch (error) {
      if (!(error instanceof ApiError) || !FALLBACK_STATUSES.has(error.status)) throw error;
      const content = await chat(messages, attachments);
      onDelta(content);
      return content;
    }

    return consume(response, onDelta);
  },

  getConfig: () => apiClient.get<{ model: string }>('/api/v1/ai/config'),
} as const;
