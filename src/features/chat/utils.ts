import { format, isToday, isYesterday, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { Conversation, ConversationMember } from './types';

const AVATAR_PALETTE = [
  '#7132f5', '#e0495e', '#49a0e0', '#149e61',
  '#e0c849', '#e07849', '#9e75e7', '#e049c8',
];

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export function formatListTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Hôm qua';
  if (differenceInDays(new Date(), d) < 7) return format(d, 'EEE', { locale: vi });
  return format(d, 'dd/MM');
}

export function formatBubbleTime(iso: string): string {
  return format(new Date(iso), 'HH:mm');
}

export function getMemberName(member: ConversationMember | undefined | null): string | null {
  if (!member) return null;
  return member.nickname || member.displayName || member.username || null;
}

export function buildMemberNameMap(conv: Conversation | null | undefined): Record<string, string> {
  const map: Record<string, string> = {};
  conv?.members?.forEach((m) => {
    const name = getMemberName(m);
    if (name) map[m.userId] = name;
  });
  return map;
}

export function getConversationName(conv: Conversation, meId: string | null): string {
  if (conv.name) return conv.name;
  if (conv.type === 'DIRECT') {
    const other = conv.members?.find((m) => m.userId !== meId);
    if (other) return other.nickname || other.displayName || other.username || 'Trò chuyện';
    const otherId = conv.memberIds.find((id) => id !== meId);
    return otherId ?? 'Trò chuyện';
  }
  return 'Nhóm chưa đặt tên';
}

export function getConversationSeed(conv: Conversation, meId: string | null): string {
  if (conv.type === 'DIRECT') {
    const other = conv.members?.find((m) => m.userId !== conv.ownerId);
    if (other) return other.userId;
    return conv.memberIds.find((id) => id !== meId) ?? conv.id;
  }
  return conv.id;
}
