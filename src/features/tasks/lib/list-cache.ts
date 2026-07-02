/**
 * Helper thuần cho cache dạng list (comments/checklist/attachments) — áp payload
 * socket thẳng vào React Query cache, tránh refetch. Không mutate list gốc.
 */

interface HasId {
  id: string;
}

/** Thêm mới hoặc thay item cùng id (event của chính mình có thể tới sau refetch) */
export function upsertById<T extends HasId>(
  list: readonly T[],
  item: T,
  compare: (a: T, b: T) => number,
): T[] {
  return [...list.filter((x) => x.id !== item.id), item].sort(compare);
}

/** Merge partial vào item theo id; null khi không tìm thấy → caller fallback invalidate */
export function patchById<T extends HasId>(
  list: readonly T[],
  id: string,
  patch: Partial<T>,
): T[] | null {
  if (!list.some((x) => x.id === id)) return null;
  return list.map((x) => (x.id === id ? { ...x, ...patch } : x));
}

export function removeById<T extends HasId>(list: readonly T[], id: string): T[] {
  return list.filter((x) => x.id !== id);
}
