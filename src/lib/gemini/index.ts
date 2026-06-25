'use client';

export type GeminiModelInfo = { label: string; value: string };

// In-memory only — không persist localStorage
export type AiAttachment = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  base64Data: string;
  previewUrl?: string; // object URL cho ảnh
};

export const GEMINI_FREE_MODELS: GeminiModelInfo[] = [
  { label: 'Gemini 2.0 Flash Lite (free)', value: 'gemini-2.0-flash-lite' },
  { label: 'Gemini 2.0 Flash (free)', value: 'gemini-2.0-flash' },
  { label: 'Gemini 1.5 Flash (free)', value: 'gemini-1.5-flash' },
  { label: 'Gemini 1.5 Flash 8B (free)', value: 'gemini-1.5-flash-8b' },
];

export async function callGemini(
  model: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  attachments?: Pick<AiAttachment, 'base64Data' | 'mimeType' | 'name'>[],
): Promise<string> {
  const res = await fetch('/api/gemini/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, attachments }),
  });
  const data = await res.json() as { content?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Gemini lỗi');
  return data.content ?? '';
}

export async function fetchGeminiModels(): Promise<GeminiModelInfo[]> {
  try {
    const res = await fetch('/api/gemini/models');
    if (!res.ok) return GEMINI_FREE_MODELS;
    const data = await res.json() as { models: GeminiModelInfo[] };
    return data.models.length > 0 ? data.models : GEMINI_FREE_MODELS;
  } catch {
    return GEMINI_FREE_MODELS;
  }
}
