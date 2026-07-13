'use client';

export type BotDemoCommand = 'dice' | 'coin' | 'joke' | 'time' | 'hello';

/** Username của bot đứng sau BOT_DEMO_TOKEN — dùng để chỉ hiện nút demo đúng conversation. */
export async function getBotDemoIdentity(): Promise<{ username: string } | null> {
  const res = await fetch('/api/bot-demo');
  if (!res.ok) return null;
  const data = (await res.json()) as { username?: string };
  return data.username ? { username: data.username } : null;
}

export async function sendBotDemoMessage(
  conversationUuid: string,
  command: BotDemoCommand,
): Promise<{ text: string; messageUuid: string }> {
  const res = await fetch('/api/bot-demo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationUuid, command }),
  });
  const data = (await res.json()) as { text?: string; messageUuid?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Gửi tin demo thất bại');
  return { text: data.text ?? '', messageUuid: data.messageUuid ?? '' };
}
