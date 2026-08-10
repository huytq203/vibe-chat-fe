'use client';

import { useMemo } from 'react';
import { differenceInDays, format, isToday, isYesterday } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { AiSession } from '@/features/chat/hooks/useAiSessions';

export type AiSessionGroup = {
  label: string;
  sessions: AiSession[];
};

/** Nhãn thời gian ngắn cho item lịch sử — cùng quy ước với danh sách hội thoại chat. */
export function formatSessionTime(updatedAt: number): string {
  const date = new Date(updatedAt);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Hôm qua';
  if (differenceInDays(new Date(), date) < 7) return format(date, 'EEEE', { locale: vi });
  return format(date, 'dd/MM/yyyy');
}

/** Dòng preview dưới tiêu đề: tin nhắn cuối, có tiền tố khi là câu trả lời của AI. */
export function getSessionSnippet(session: AiSession): string {
  const last = session.messages[session.messages.length - 1];
  if (!last) return 'Chưa có tin nhắn';
  const text = last.content.trim();
  if (text) return last.role === 'assistant' ? `Halo AI: ${text}` : text;
  return last.attachments?.[0]?.name ?? 'Tệp đính kèm';
}

const GROUP_LABELS = ['Hôm nay', '7 ngày qua', 'Cũ hơn'] as const;

/** Lọc theo từ khoá rồi gom nhóm theo mốc thời gian; chỉ tính lại khi sessions/query đổi. */
export function useAiSessionGroups(sessions: AiSession[], query: string): AiSessionGroup[] {
  return useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const matched = keyword
      ? sessions.filter(
          (session) =>
            session.title.toLowerCase().includes(keyword) ||
            session.messages.some((message) => message.content.toLowerCase().includes(keyword)),
        )
      : sessions;

    const groups: AiSessionGroup[] = GROUP_LABELS.map((label) => ({ label, sessions: [] }));
    const now = new Date();

    for (const session of [...matched].sort((a, b) => b.updatedAt - a.updatedAt)) {
      const date = new Date(session.updatedAt);
      const index = isToday(date) ? 0 : differenceInDays(now, date) < 7 ? 1 : 2;
      groups[index]?.sessions.push(session);
    }

    return groups.filter((group) => group.sessions.length > 0);
  }, [sessions, query]);
}
