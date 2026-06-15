import type { ConversationMember, Mention } from '@/features/chat/types';

export const MAX_LENGTH = 5000;
export const TYPING_STOP_DEBOUNCE_MS = 3_000;

/** Sentinel cho chip `@all` — submit sẽ expand thành toàn bộ userId member. */
export const MENTION_ALL = '__ALL__';
/** Nhãn hiển thị của chip `@all`. */
export const MENTION_ALL_LABEL = 'all';

/** Tên hiển thị ưu tiên nickname → displayName → username. */
export function mentionLabel(member: ConversationMember): string {
  return member.nickname || member.displayName || member.username;
}

/**
 * Khai triển sentinel `@all` thành mention cho từng `memberId` (giữ nguyên
 * offset/length của token), gộp mention thường, khử trùng userId, cap `max`.
 */
export function expandAllMentions(
  raw: Mention[],
  memberIds: string[],
  max: number,
): Mention[] {
  const out: Mention[] = [];
  const seen = new Set<string>();
  const push = (m: Mention) => {
    if (seen.has(m.userId) || out.length >= max) return;
    seen.add(m.userId);
    out.push(m);
  };
  raw.forEach((m) => {
    if (m.userId !== MENTION_ALL) return push(m);
    memberIds.forEach((userId) => push({ userId, startOffset: m.startOffset, length: m.length }));
  });
  return out;
}
