export type SseEvent = {
  /** Tên sự kiện (`event:`). Mặc định `message` theo đúng spec SSE. */
  event: string;
  data: string;
};

function parseBlock(raw: string): SseEvent | null {
  let event = 'message';
  const data: string[] = [];

  for (const line of raw.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data.push(line.slice(5).trim());
  }

  return data.length > 0 ? { event, data: data.join('\n') } : null;
}

/**
 * Bóc luồng `text/event-stream` thành từng sự kiện.
 * Tự gộp phần bị cắt giữa hai chunk mạng — một event có thể tới làm nhiều lần.
 */
export async function* readSseEvents(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<SseEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf('\n\n');
        const parsed = parseBlock(block);
        if (parsed) yield parsed;
      }
    }
  } finally {
    // Thoát sớm (abort / caller break) phải đóng luôn kết nối tới BE.
    await reader.cancel().catch(() => undefined);
  }
}
