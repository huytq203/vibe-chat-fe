import { NextRequest, NextResponse } from 'next/server';

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
}

interface RequestAttachment {
  base64Data: string;
  mimeType: string;
  name: string;
}

interface RequestBody {
  model: string;
  messages: { role: string; content: string }[];
  attachments?: RequestAttachment[];
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY chưa được cấu hình' }, { status: 500 });
  }

  const body = (await req.json()) as RequestBody;
  const attachments = body.attachments ?? [];
  const lastIdx = body.messages.length - 1;

  const contents: GeminiContent[] = body.messages.map((m, idx) => {
    const role = m.role === 'assistant' ? 'model' : ('user' as const);
    if (idx === lastIdx && role === 'user' && attachments.length > 0) {
      return {
        role,
        parts: [
          ...attachments.map((a) => ({
            inlineData: { mimeType: a.mimeType, data: a.base64Data },
          })),
          { text: m.content },
        ],
      };
    }
    return { role, parts: [{ text: m.content }] };
  });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${body.model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents }),
    },
  );

  const data = (await res.json()) as GeminiResponse;
  if (!res.ok) {
    return NextResponse.json({ error: data.error?.message ?? 'Gemini lỗi' }, { status: res.status });
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return NextResponse.json({ content: text });
}
