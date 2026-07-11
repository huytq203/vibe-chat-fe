'use client';

// In-memory only — không persist localStorage
export type AiAttachment = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  base64Data: string;
  previewUrl?: string; // object URL cho ảnh
};

export async function callGemini(
  messages: { role: 'user' | 'assistant'; content: string }[],
  attachments?: Pick<AiAttachment, 'base64Data' | 'mimeType' | 'name'>[],
): Promise<string> {
  const res = await fetch('/api/gemini/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, attachments }),
  });
  const data = await res.json() as { content?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Gemini lỗi');
  return data.content ?? '';
}
