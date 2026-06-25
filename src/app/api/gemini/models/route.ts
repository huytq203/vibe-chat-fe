import { NextResponse } from 'next/server';

interface GeminiModel {
  name: string;
  displayName?: string;
  supportedGenerationMethods?: string[];
}

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ models: [] });
  }

  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
    headers: { 'x-goog-api-key': apiKey },
  });

  if (!res.ok) return NextResponse.json({ models: [] });

  const data = await res.json() as { models?: GeminiModel[] };
  const models = (data.models ?? [])
    .filter(
      (m) =>
        m.name.includes('gemini') &&
        !m.name.includes('embedding') &&
        m.supportedGenerationMethods?.includes('generateContent'),
    )
    .map((m) => ({
      label: m.displayName ?? m.name.replace('models/', ''),
      value: m.name.replace('models/', ''),
    }));

  return NextResponse.json({ models });
}
