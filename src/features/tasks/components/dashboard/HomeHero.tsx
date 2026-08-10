'use client';

import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAuthStore } from '@/features/auth';
import { getGreeting } from '../../lib/view-title';

interface HomeHeroProps {
  overdueCount: number;
  todayCount: number;
  isPending: boolean;
}

/** Câu tóm tắt thay cho lời chào chung chung — nói thẳng hôm nay phải xử lý gì. */
function buildSummary(overdueCount: number, todayCount: number, isPending: boolean): string {
  if (isPending) return 'Đang tổng hợp việc của bạn…';
  if (overdueCount > 0 && todayCount > 0) {
    return `${overdueCount} việc quá hạn và ${todayCount} việc đến hạn hôm nay.`;
  }
  if (overdueCount > 0) return `${overdueCount} việc đã quá hạn, xử lý sớm giúp bạn nhé.`;
  if (todayCount > 0) return `${todayCount} việc đến hạn hôm nay.`;
  return 'Không có việc nào đến hạn hôm nay.';
}

export function HomeHero({ overdueCount, todayCount, isPending }: HomeHeroProps) {
  const displayName = useAuthStore((s) => s.user?.displayName ?? s.user?.username ?? null);
  const today = format(new Date(), "EEEE, dd 'tháng' M", { locale: vi });

  return (
    <div className="mb-5">
      <p className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        {today}
      </p>
      <h1 className="mt-1.5 text-balance text-[26px] font-extrabold leading-tight tracking-tight text-foreground">
        {getGreeting()}
        {displayName ? `, ${displayName}` : ''}
      </h1>
      <p className="mt-1 text-[13.5px] leading-snug text-muted-foreground">
        {buildSummary(overdueCount, todayCount, isPending)}
      </p>
    </div>
  );
}
