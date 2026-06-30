import { describe, it, expect } from 'vitest';
import { computeBoardProgress } from '../lib/board-progress';
import type { Board } from '../types';

function board(cols: { isDoneCol: boolean; n: number }[]): Board {
  return {
    project: {} as never,
    columns: cols.map((c, i) => ({
      id: `c${i}`,
      name: 'c',
      color: null,
      position: i,
      isDoneCol: c.isDoneCol,
      tasks: Array.from({ length: c.n }, (_, j) => ({ id: `t${i}-${j}` })) as never,
    })),
  };
}

describe('computeBoardProgress', () => {
  it('board undefined → 0', () => {
    expect(computeBoardProgress(undefined)).toEqual({ total: 0, done: 0, open: 0, pct: 0 });
  });
  it('tính done/open/pct', () => {
    const r = computeBoardProgress(board([{ isDoneCol: false, n: 3 }, { isDoneCol: true, n: 1 }]));
    expect(r).toEqual({ total: 4, done: 1, open: 3, pct: 25 });
  });
  it('board rỗng → pct 0', () => {
    expect(computeBoardProgress(board([])).pct).toBe(0);
  });
});
