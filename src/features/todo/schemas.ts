import { z } from 'zod';

/**
 * Schema dùng SHARED giữa client (RHF resolver) và server (action validate).
 * Đây là single source of truth — đổi rule chỉ ở 1 nơi.
 */
export const createTodoSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Tiêu đề không được rỗng')
    .max(200, 'Tiêu đề tối đa 200 ký tự'),
});

export type CreateTodoInput = z.infer<typeof createTodoSchema>;

export const todoIdSchema = z.object({
  id: z.string().min(1),
});
