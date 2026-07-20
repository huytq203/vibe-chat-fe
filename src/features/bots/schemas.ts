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

export const updateBotInlineSchema = z.object({
  enabled: z.boolean(),
  placeholder: z.string().max(64, 'Tối đa 64 ký tự').optional(),
});
export type UpdateBotInlineInput = z.infer<typeof updateBotInlineSchema>;

export const updateBotWebappSchema = z
  .object({
    enabled: z.boolean(),
    menuUrl: z
      .string()
      .trim()
      .max(500, 'Tối đa 500 ký tự')
      .optional()
      .or(z.literal('')),
    menuText: z
      .string()
      .trim()
      .max(32, 'Tối đa 32 ký tự')
      .optional()
      .or(z.literal('')),
    allowedDomainsText: z.string().max(2000, 'Tối đa 2000 ký tự').optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.enabled) return;
    if (!value.menuUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['menuUrl'],
        message: 'Bật WebApp cần URL menu',
      });
      return;
    }
    try {
      const url = new URL(value.menuUrl);
      if (url.protocol !== 'https:') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['menuUrl'],
          message: 'WebApp URL phải dùng HTTPS',
        });
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['menuUrl'],
        message: 'URL không hợp lệ',
      });
    }
  });
export type UpdateBotWebappInput = z.infer<typeof updateBotWebappSchema>;

export const BOT_TOKEN_SCOPES = [
  'messages:send',
  'messages:manage',
  'media:send',
  'broadcast:send',
  'webhook:manage',
  'commands:manage',
  'callbacks:answer',
  'inline:answer',
  'webapp:access',
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
  'inline:answer': 'Trả lời inline',
  'webapp:access': 'WebApp',
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
