import type { MessageReaction, ReactionType } from '@/features/chat/types';

/**
 * Tính summary + myReaction sau khi user toggle 1 cảm xúc (mỗi user 1 reaction/tin).
 * - current === type  → gỡ cảm xúc.
 * - current !== type  → đặt type mới (ghi đè cảm xúc cũ nếu có).
 * Pure (không phụ thuộc API/cache) → test độc lập.
 */
export function computeOptimistic(
  reactions: MessageReaction[] | undefined,
  current: ReactionType | null,
  type: ReactionType,
): { reactions: MessageReaction[]; myReaction: ReactionType | null } {
  const willRemove = current === type;
  const counts = new Map<ReactionType, number>();
  for (const r of reactions ?? []) counts.set(r.type, r.count);
  if (current) counts.set(current, (counts.get(current) ?? 1) - 1);
  if (!willRemove) counts.set(type, (counts.get(type) ?? 0) + 1);

  const next = [...counts.entries()]
    .filter(([, c]) => c > 0)
    .map(([t, c]) => ({ type: t, count: c }))
    .sort((a, b) => b.count - a.count);
  return { reactions: next, myReaction: willRemove ? null : type };
}
