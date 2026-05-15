'use server';

import { revalidatePath } from 'next/cache';
import { todoDb } from '@/lib/db/in-memory-todos';
import { fail, ok, type Result } from '@/lib/result';
import { logger } from '@/lib/logger';
import { createTodoSchema } from '../schemas';
import type { Todo } from '../types';

/**
 * Server Action — checklist BẮT BUỘC:
 *  1. Validate input bằng Zod (KHÔNG tin client).
 *  2. AuthZ ở đây (TODO: thêm khi có NextAuth).
 *  3. Trả Result Object, không leak raw error.
 *  4. revalidatePath / revalidateTag sau khi mutate.
 */
export async function createTodoAction(input: unknown): Promise<Result<Todo>> {
  const parsed = createTodoSchema.safeParse(input);
  if (!parsed.success) {
    return fail('Dữ liệu không hợp lệ', parsed.error.flatten().fieldErrors);
  }

  // TODO: const session = await getSession(); if (!session) return fail('Unauthorized');

  try {
    const todo = todoDb.create(parsed.data);
    revalidatePath('/');
    return ok(todo);
  } catch (err) {
    logger.error('createTodoAction failed', { err: String(err) });
    return fail('Không tạo được todo, vui lòng thử lại');
  }
}
