import { describe, expect, it } from 'vitest';
import { buildTaskAiContext } from './ai-context';

describe('buildTaskAiContext', () => {
  it('dùng ngày theo múi giờ local của máy', () => {
    const now = new Date(2026, 8, 12, 23, 30);

    expect(buildTaskAiContext('project-1', now).today).toBe('2026-09-12');
  });

  it('luôn trả timezone là chuỗi không rỗng', () => {
    expect(buildTaskAiContext(null).timezone.trim()).not.toBe('');
  });

  it('không gửi projectId khi chưa chọn project', () => {
    expect(buildTaskAiContext(null)).not.toHaveProperty('projectId');
  });
});
