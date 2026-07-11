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
  'media:send',
  'webhook:manage',
  'commands:manage',
] as const;
export type BotTokenScope = (typeof BOT_TOKEN_SCOPES)[number];

export const BOT_TOKEN_SCOPE_LABELS: Record<BotTokenScope, string> = {
  'messages:send': 'Gửi tin nhắn',
  'media:send': 'Gửi media',
  'webhook:manage': 'Quản lý webhook',
  'commands:manage': 'Quản lý command',
};

export const issueTokenSchema = z.object({
  scopes: z.array(z.enum(BOT_TOKEN_SCOPES)).optional(),
  expiresAt: z.string().datetime().optional(),
});
export type IssueTokenInput = z.infer<typeof issueTokenSchema>;
