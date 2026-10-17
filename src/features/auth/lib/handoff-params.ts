import { z } from 'zod';
import type { HandoffParams } from '@/features/auth/types';

const handoffSchema = z.object({
  client: z.literal('desktop'),
  state: z.string().regex(/^[A-Za-z0-9_-]{16,128}$/),
  code_challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});

/**
 * Trang /login được app desktop mở trong trình duyệt hệ thống với
 * `?client=desktop&state=…&code_challenge=…`. Sai bất kỳ tham số nào → coi như web thường.
 */
export function parseHandoffParams(
  search: Record<string, string | string[] | undefined>,
): HandoffParams | null {
  const parsed = handoffSchema.safeParse(search);
  if (!parsed.success) return null;
  return { state: parsed.data.state, codeChallenge: parsed.data.code_challenge };
}
