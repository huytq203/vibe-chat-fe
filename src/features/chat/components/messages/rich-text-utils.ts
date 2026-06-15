import type { RichText } from '@/features/chat/types';

/** Lấy richText hợp lệ từ metadata (tin cũ / không định dạng → null). */
export function getRichText(metadata: Record<string, unknown> | null): RichText | null {
  const rt = metadata?.richText as RichText | undefined;
  if (!rt || rt.v !== 1 || !Array.isArray(rt.marks) || !Array.isArray(rt.blocks)) return null;
  if (rt.marks.length === 0 && rt.blocks.length === 0) return null;
  return rt;
}
