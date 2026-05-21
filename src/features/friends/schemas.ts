import { z } from 'zod';

export const sendFriendRequestSchema = z.object({
  targetUserId: z.string().uuid('userId không hợp lệ'),
  nickname: z
    .string()
    .trim()
    .max(50, 'Biệt danh tối đa 50 ký tự')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  source: z
    .enum(['PHONE', 'SEARCH', 'QR', 'GROUP', 'LINK', 'SUGGEST'])
    .optional(),
});

export type SendFriendRequestInput = z.infer<typeof sendFriendRequestSchema>;
