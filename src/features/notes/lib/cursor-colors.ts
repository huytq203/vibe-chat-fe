export const CURSOR_COLORS = [
  '#f87171',
  '#fb923c',
  '#facc15',
  '#a3e635',
  '#4ade80',
  '#34d399',
  '#60a5fa',
  '#f472b6',
] as const;

/** Màu suy ra từ hash userId để CÙNG một người ra CÙNG màu ở mọi máy. */
export function cursorColorFor(userId: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < userId.length; index += 1) {
    hash ^= userId.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return CURSOR_COLORS[(hash >>> 0) % CURSOR_COLORS.length];
}
