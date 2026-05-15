'use server';

import { revalidatePath } from 'next/cache';
import { todoDb } from '@/lib/db/in-memory-todos';
import { fail, ok, type Result } from '@/lib/result';
import { logger } from '@/lib/logger';
import { todoIdSchema } from '../schemas';

export async function deleteTodoAction(id: string): Promise<Result<{ id: string }>> {
  const parsed = todoIdSchema.safeParse({ id });
  if (!parsed.success) return fail('ID không hợp lệ');

  try {
    const removed = todoDb.delete(parsed.data.id);
    if (!removed) return fail('Todo không tồn tại');
    revalidatePath('/');
    return ok({ id: parsed.data.id });
  } catch (err) {
    logger.error('deleteTodoAction failed', { err: String(err) });
    return fail('Không xóa được, vui lòng thử lại');
  }
}
