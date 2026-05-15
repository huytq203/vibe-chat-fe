'use server';

import { revalidatePath } from 'next/cache';
import { todoDb } from '@/lib/db/in-memory-todos';
import { fail, ok, type Result } from '@/lib/result';
import { logger } from '@/lib/logger';
import { todoIdSchema } from '../schemas';
import type { Todo } from '../types';

export async function toggleTodoAction(id: string): Promise<Result<Todo>> {
  const parsed = todoIdSchema.safeParse({ id });
  if (!parsed.success) return fail('ID không hợp lệ');

  try {
    const updated = todoDb.toggle(parsed.data.id);
    if (!updated) return fail('Todo không tồn tại');
    revalidatePath('/');
    return ok(updated);
  } catch (err) {
    logger.error('toggleTodoAction failed', { err: String(err) });
    return fail('Không cập nhật được, vui lòng thử lại');
  }
}
