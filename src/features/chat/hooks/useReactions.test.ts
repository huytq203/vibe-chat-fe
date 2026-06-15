import { describe, expect, it } from 'vitest';
import { computeOptimistic } from './reactions-logic';
import type { MessageReaction } from '@/features/chat/types';

describe('computeOptimistic', () => {
  it('thêm cảm xúc mới khi chưa thả gì', () => {
    const res = computeOptimistic([], null, 'LOVE');
    expect(res.myReaction).toBe('LOVE');
    expect(res.reactions).toEqual([{ type: 'LOVE', count: 1 }]);
  });

  it('gỡ cảm xúc khi bấm lại đúng loại đang thả', () => {
    const list: MessageReaction[] = [{ type: 'LOVE', count: 1 }];
    const res = computeOptimistic(list, 'LOVE', 'LOVE');
    expect(res.myReaction).toBeNull();
    expect(res.reactions).toEqual([]);
  });

  it('đổi cảm xúc: giảm loại cũ, tăng loại mới', () => {
    const list: MessageReaction[] = [{ type: 'LIKE', count: 2 }];
    const res = computeOptimistic(list, 'LIKE', 'LOVE');
    expect(res.myReaction).toBe('LOVE');
    expect(res.reactions).toEqual(
      expect.arrayContaining([
        { type: 'LIKE', count: 1 },
        { type: 'LOVE', count: 1 },
      ]),
    );
  });

  it('giữ cảm xúc của người khác khi mình đổi loại', () => {
    const list: MessageReaction[] = [{ type: 'LIKE', count: 3 }];
    const res = computeOptimistic(list, null, 'HAHA');
    expect(res.reactions).toEqual(
      expect.arrayContaining([
        { type: 'LIKE', count: 3 },
        { type: 'HAHA', count: 1 },
      ]),
    );
  });

  it('sắp xếp summary giảm dần theo count', () => {
    const list: MessageReaction[] = [
      { type: 'LIKE', count: 1 },
      { type: 'LOVE', count: 5 },
    ];
    const res = computeOptimistic(list, null, 'LIKE');
    expect(res.reactions[0]).toEqual({ type: 'LOVE', count: 5 });
  });
});
