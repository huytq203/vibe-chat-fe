'use client';

import { useMemo } from 'react';
import { differenceInDays, format, isToday, isYesterday } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { AiConversationSummary } from '@/services/ai-conversations.api';

export type AiSessionGroup = {
  label: string;
  conversations: AiConversationSummary[];
};

/** Nhãn thời gian ngắn cho item lịch sử — cùng quy ước với danh sách hội thoại chat. */
export function formatSessionTime(updatedAt: string): string {
  const date = new Date(updatedAt);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Hôm qua';
  if (differenceInDays(new Date(), date) < 7) return format(date, 'EEEE', { locale: vi });
  return format(date, 'dd/MM/yyyy');
}

const GROUP_LABELS = ['Hôm nay', '7 ngày qua', 'Cũ hơn'] as const;

/** Lọc theo tiêu đề rồi gom nhóm theo mốc thời gian của hội thoại từ API. */
export function useAiSessionGroups(
  conversations: AiConversationSummary[],
  query: string,
): AiSessionGroup[] {
  return useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const matched = keyword
      ? conversations.filter(({ title }) => title?.toLowerCase().includes(keyword))
      : conversations;

    const groups: AiSessionGroup[] = GROUP_LABELS.map((label) => ({ label, conversations: [] }));
    const now = new Date();

    for (const conversation of [...matched].sort(
      (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
    )) {
      const date = new Date(conversation.updatedAt);
      const index = isToday(date) ? 0 : differenceInDays(now, date) < 7 ? 1 : 2;
      groups[index]?.conversations.push(conversation);
    }

    return groups.filter((group) => group.conversations.length > 0);
  }, [conversations, query]);
}
