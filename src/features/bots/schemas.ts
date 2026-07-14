import { z } from 'zod';

const USERNAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{2,31}$/;
const USERNAME_CONTAINS_BOT = /bot/i;

export const createBotSchema = z.object({
  username: z
    .string()
    .regex(
      USERNAME_PATTERN,
      'Username phải bắt đầu bằng chữ cái, 3-32 ký tự, chỉ gồm chữ/số/underscore',
    )
    .regex(USERNAME_CONTAINS_BOT, 'Username phải chứa "bot" để phân biệt với tên user thường'),
  displayName: z.string().min(1, 'Không được để trống').max(64, 'Tối đa 64 ký tự'),
  description: z.string().max(500, 'Tối đa 500 ký tự').optional(),
});
export type CreateBotInput = z.infer<typeof createBotSchema>;

export const updateBotSchema = createBotSchema.partial();
export type UpdateBotInput = z.infer<typeof updateBotSchema>;

export const BOT_TOKEN_SCOPES = [
  'messages:send',
  'messages:manage',
  'media:send',
  'broadcast:send',
  'webhook:manage',
  'commands:manage',
  'callbacks:answer',
  'analytics:read',
  'chat:admin',
] as const;
export type BotTokenScope = (typeof BOT_TOKEN_SCOPES)[number];

export const BOT_TOKEN_SCOPE_LABELS: Record<BotTokenScope, string> = {
  'messages:send': 'Gửi tin nhắn',
  'messages:manage': 'Quản lý tin nhắn',
  'media:send': 'Gửi media',
  'broadcast:send': 'Gửi broadcast',
  'webhook:manage': 'Quản lý webhook',
  'commands:manage': 'Quản lý command',
  'callbacks:answer': 'Trả lời callback',
  'analytics:read': 'Đọc analytics',
  'chat:admin': 'Quản trị nhóm',
};

export const issueTokenSchema = z.object({
  scopes: z.array(z.enum(BOT_TOKEN_SCOPES)).optional(),
  expiresAt: z.string().datetime().optional(),
});
export type IssueTokenInput = z.infer<typeof issueTokenSchema>;

export const BOT_DEMO_COMMANDS = ['dice', 'coin', 'joke', 'time', 'hello'] as const;
export type BotDemoCommand = (typeof BOT_DEMO_COMMANDS)[number];

export const BOT_DEMO_COMMAND_LABELS: Record<BotDemoCommand, string> = {
  dice: '🎲 Tung xúc xắc',
  coin: '🪙 Tung đồng xu',
  joke: '😂 Kể chuyện cười',
  time: '🕐 Giờ hiện tại',
  hello: '👋 Chào hỏi',
};

export const botDemoSendSchema = z.object({
  conversationUuid: z.string().uuid('Phải là UUID hợp lệ (dán từ URL /chat/<uuid>)'),
});
export type BotDemoSendInput = z.infer<typeof botDemoSendSchema>;
