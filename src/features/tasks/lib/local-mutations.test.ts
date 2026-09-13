import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isLocal, markLocal } from './local-mutations';

describe('dấu mutation cục bộ', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-13T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('còn hiệu lực trong 3000 mili giây và tự hết hạn', () => {
    markLocal('task-ttl', 'task:updated');

    expect(isLocal('task-ttl', 'task:updated')).toBe(true);
    vi.advanceTimersByTime(2_999);
    expect(isLocal('task-ttl', 'task:updated')).toBe(true);
    vi.advanceTimersByTime(2);
    expect(isLocal('task-ttl', 'task:updated')).toBe(false);
  });

  it('phân biệt task và loại mutation', () => {
    markLocal('task-kind', 'task:moved');

    expect(isLocal('task-kind', 'task:moved')).toBe(true);
    expect(isLocal('task-kind', 'task:updated')).toBe(false);
    expect(isLocal('task-other', 'task:moved')).toBe(false);
  });
});
