import { NextRequest, NextResponse } from 'next/server';

interface GeminiContent {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY chưa được cấu hình' }, { status: 500 });
  }

  const body = await req.json() as { model: string; messages: { role: string; content: string }[] };

  const contents: GeminiContent[] = body.messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${body.model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents }),
    },
  );

  const data = await res.json() as GeminiResponse;
  if (!res.ok) {
    return NextResponse.json({ error: data.error?.message ?? 'Gemini lỗi' }, { status: res.status });
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return NextResponse.json({ content: text });
}
