import type { Board } from '../types';

export interface BoardProgress {
  total: number;
  done: number;
  open: number;
  pct: number;
}

export function computeBoardProgress(board: Board | undefined): BoardProgress {
  if (!board) return { total: 0, done: 0, open: 0, pct: 0 };
  let total = 0;
  let done = 0;
  for (const col of board.columns) {
    total += col.tasks.length;
    if (col.isDoneCol) done += col.tasks.length;
  }
  return { total, done, open: total - done, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}
