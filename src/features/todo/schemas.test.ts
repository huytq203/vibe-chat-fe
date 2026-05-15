import { describe, expect, it } from 'vitest';
import { createTodoSchema } from './schemas';

describe('createTodoSchema', () => {
  it('accept tiêu đề hợp lệ', () => {
    const r = createTodoSchema.safeParse({ title: 'Đọc CLAUDE.md' });
    expect(r.success).toBe(true);
  });

  it('reject tiêu đề rỗng', () => {
    const r = createTodoSchema.safeParse({ title: '   ' });
    expect(r.success).toBe(false);
  });

  it('reject tiêu đề > 200 ký tự', () => {
    const r = createTodoSchema.safeParse({ title: 'x'.repeat(201) });
    expect(r.success).toBe(false);
  });
});
