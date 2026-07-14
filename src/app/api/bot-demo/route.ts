import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const BOT_DEMO_COMMANDS = ['dice', 'coin', 'joke', 'time', 'hello'] as const;
type BotDemoCommand = (typeof BOT_DEMO_COMMANDS)[number];

const bodySchema = z.object({
  conversationUuid: z.string().uuid(),
  command: z.enum(BOT_DEMO_COMMANDS),
});

const JOKES = [
  'Sao lập trình viên hay nhầm Halloween với Christmas? Vì OCT 31 == DEC 25.',
  'Có bao nhiêu lập trình viên để thay 1 bóng đèn? Không cái nào — đó là vấn đề phần cứng.',
  '99 con bug nhỏ trên tường, fix 1 con thì thành 127 con bug trên tường.',
];

/** Sinh nội dung "trò vui" — thuần đoán/random, không gọi service ngoài. */
function buildReplyText(command: BotDemoCommand): string {
  switch (command) {
    case 'dice':
      return `🎲 Bạn tung được: ${1 + Math.floor(Math.random() * 6)}`;
    case 'coin':
      return `🪙 Kết quả: ${Math.random() < 0.5 ? 'Ngửa' : 'Sấp'}`;
    case 'joke':
      return `😂 ${JOKES[Math.floor(Math.random() * JOKES.length)]}`;
    case 'time':
      return `🕐 Giờ hiện tại: ${new Date().toLocaleString('vi-VN')}`;
    case 'hello':
      return '👋 Chào bạn! Mình là bot demo của halo-chat.';
  }
}

type BotServiceEnvelope =
  | { success: true; data: { messageUuid: string; createdAt: string } }
  | { success: false; error: { code: string; message: string } };

type BotSelfEnvelope =
  | { success: true; data: { username: string } }
  | { success: false; error: { code: string; message: string } };

/**
 * "Whoami" cho demo bot — FE dùng để CHỈ hiện nút demo đúng trên cuộc trò
 * chuyện với bot này (so username), tránh gửi nhầm sang bot khác → 403
 * "Bot chưa được start" (BOT_NOT_STARTED) vì bot trong token không phải
 * thành viên của conversation đó.
 */
export async function GET() {
  const botUrl = process.env.BOT_URL;
  const botToken = process.env.BOT_DEMO_TOKEN;
  if (!botUrl || !botToken) {
    return NextResponse.json(
      { error: 'BOT_URL hoặc BOT_DEMO_TOKEN chưa được cấu hình ở server' },
      { status: 500 },
    );
  }

  const res = await fetch(`${botUrl}/api/v1/bot/me`, {
    headers: { Authorization: `Bearer ${botToken}` },
  });
  const data = (await res.json()) as BotSelfEnvelope;
  if (!res.ok || !data.success) {
    const message = !data.success ? data.error.message : 'bot-service lỗi';
    return NextResponse.json({ error: message }, { status: res.status });
  }

  return NextResponse.json({ username: data.data.username });
}

export async function POST(req: NextRequest) {
  const botUrl = process.env.BOT_URL;
  const botToken = process.env.BOT_DEMO_TOKEN;
  if (!botUrl || !botToken) {
    return NextResponse.json(
      { error: 'BOT_URL hoặc BOT_DEMO_TOKEN chưa được cấu hình ở server' },
      { status: 500 },
    );
  }

  const raw = await req.json();
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
  }
  const { conversationUuid, command } = parsed.data;
  const text = buildReplyText(command);

  const res = await fetch(`${botUrl}/api/v1/bot/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${botToken}`,
      'Idempotency-Key': randomUUID(),
    },
    body: JSON.stringify({ conversationUuid, text }),
  });

  const data = (await res.json()) as BotServiceEnvelope;
  if (!res.ok || !data.success) {
    const message = !data.success ? data.error.message : 'bot-service lỗi';
    return NextResponse.json({ error: message }, { status: res.status });
  }

  return NextResponse.json({ text, messageUuid: data.data.messageUuid });
}
