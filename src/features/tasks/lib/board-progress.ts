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
    for (const t of col.tasks) {
      total += 1;
      // Task được coi là hoàn thành khi: đã bấm Hoàn thành (status DONE / completedAt)
      // HOẶC nằm trong cột đánh dấu Done — không bắt buộc phải kéo sang cột Done
      const isDone = t.status === 'DONE' || Boolean(t.completedAt) || col.isDoneCol;
      if (isDone) done += 1;
    }
  }
  return { total, done, open: total - done, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}
