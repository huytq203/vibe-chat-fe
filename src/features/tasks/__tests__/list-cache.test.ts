import { describe, it, expect } from 'vitest';
import { upsertById, patchById, removeById } from '../lib/list-cache';

interface Row {
  id: string;
  content: string;
  position: number;
}

const rows: Row[] = [
  { id: 'a', content: 'A', position: 1000 },
  { id: 'b', content: 'B', position: 2000 },
];

describe('upsertById', () => {
  it('append item mới và sort theo comparator', () => {
    const next = upsertById(rows, { id: 'c', content: 'C', position: 1500 }, (x, y) => x.position - y.position);
    expect(next.map((r) => r.id)).toEqual(['a', 'c', 'b']);
  });

  it('thay item cũ cùng id thay vì nhân đôi', () => {
    const next = upsertById(rows, { id: 'a', content: 'A2', position: 1000 }, (x, y) => x.position - y.position);
    expect(next).toHaveLength(2);
    expect(next[0].content).toBe('A2');
  });

  it('không mutate list gốc', () => {
    upsertById(rows, { id: 'c', content: 'C', position: 0 }, (x, y) => x.position - y.position);
    expect(rows).toHaveLength(2);
  });
});

describe('patchById', () => {
  it('merge partial vào đúng item', () => {
    const next = patchById(rows, 'b', { content: 'B2' });
    expect(next!.find((r) => r.id === 'b')!.content).toBe('B2');
    expect(next!.find((r) => r.id === 'a')!.content).toBe('A');
  });

  it('trả null khi id không tồn tại (caller fallback invalidate)', () => {
    expect(patchById(rows, 'missing', { content: 'x' })).toBeNull();
  });
});

describe('removeById', () => {
  it('xoá đúng item', () => {
    expect(removeById(rows, 'a').map((r) => r.id)).toEqual(['b']);
  });

  it('id không tồn tại → trả list không đổi', () => {
    expect(removeById(rows, 'missing')).toHaveLength(2);
  });
});
