import { generateKeyBetween } from 'fractional-indexing';
import type { Page } from '@/features/notes/types';

const VALID_SORT_KEY = /^[A-Za-z0-9]+$/;

/** Khoá nằm giữa hai hàng xóm. null nghĩa là không có hàng xóm phía đó. */
export function sortKeyBetween(before: string | null, after: string | null): string {
  const sortKey = generateKeyBetween(before, after);
  if (!VALID_SORT_KEY.test(sortKey)) {
    throw new Error('Khoá sắp xếp sinh ra không hợp lệ');
  }
  return sortKey;
}

/** Khoá cho vị trí thả, tính từ danh sách anh em ở đích và chỉ số chèn. */
export function sortKeyForDrop(siblings: Page[], insertIndex: number): string {
  const ordered = [...siblings].sort((left, right) => {
    if (left.sortKey === right.sortKey) return 0;
    return left.sortKey < right.sortKey ? -1 : 1;
  });
  const index = Math.min(Math.max(insertIndex, 0), ordered.length);
  const before = ordered[index - 1]?.sortKey ?? null;
  const after = ordered[index]?.sortKey ?? null;
  return sortKeyBetween(before, after);
}
