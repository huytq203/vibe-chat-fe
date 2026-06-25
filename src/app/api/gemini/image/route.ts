import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json() as { prompt?: string };
  if (!body.prompt?.trim()) {
    return NextResponse.json({ error: 'Thiếu prompt' }, { status: 400 });
  }
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(body.prompt)}?width=512&height=512&nologo=true`;
  return NextResponse.json({ imageUrl });
}
