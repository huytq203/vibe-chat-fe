'use client';

import { ListTodo, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card/Card';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { Progress } from '@/components/ui/progress/Progress';
import { Text } from '@/components/ui/typography/Typography';
import { ScrollArea } from '@/components/ui/scroll-area/ScrollArea';
import { getViewTitle } from '../../lib/view-title';
import { PageHeading } from '../common';
import { StatCard } from './StatCard';

// TODO: replace with useReports()
const STATS = [
  { label: 'Tổng việc', value: '48', delta: '+12% so với tuần trước', deltaTone: 'up' as const, icon: <ListTodo className="h-4 w-4" /> },
  { label: 'Hoàn thành', value: '31', delta: '+8%', deltaTone: 'up' as const, icon: <CheckCircle2 className="h-4 w-4" /> },
  { label: 'Đang làm', value: '13', delta: '-3%', deltaTone: 'down' as const, icon: <Clock className="h-4 w-4" /> },
  { label: 'Quá hạn', value: '4', delta: '+1', deltaTone: 'down' as const, icon: <AlertTriangle className="h-4 w-4" /> },
];

// TODO: replace with useReports()
const WEEK = [
  { label: 'T2', pct: 40 }, { label: 'T3', pct: 65 }, { label: 'T4', pct: 50 },
  { label: 'T5', pct: 80 }, { label: 'T6', pct: 70 }, { label: 'T7', pct: 30 }, { label: 'CN', pct: 20 },
];

// TODO: replace with useReports()
const DONUT = [
  { label: 'Đang làm', pct: 27, className: 'bg-chart-1' },
  { label: 'Hoàn thành', pct: 65, className: 'bg-chart-2' },
  { label: 'Chưa bắt đầu', pct: 8, className: 'bg-chart-3' },
];

// TODO: replace with useReports()
const TEAM = [
  { name: 'An', pct: 80, count: 12 }, { name: 'Bình', pct: 60, count: 9 },
  { name: 'Châu', pct: 45, count: 7 }, { name: 'Dũng', pct: 30, count: 5 },
];

const DONUT_GRADIENT =
  'conic-gradient(var(--chart-1) 0 27%, var(--chart-2) 27% 92%, var(--chart-3) 92% 100%)';

export function ReportsView() {
  const { title, sub } = getViewTitle('reports');

  return (
    <ScrollArea className="h-full w-full">
      <div className="mx-auto w-full max-w-5xl px-7 py-8">
        <PageHeading title={title} sub={sub} />

        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {STATS.map((s) => <StatCard key={s.label} {...s} />)}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]">
          <Card>
            <CardHeader><CardTitle className="text-base">Nhiệm vụ hoàn thành theo ngày</CardTitle></CardHeader>
            <CardContent>
              <div className="flex h-[190px] items-end gap-4">
                {WEEK.map((b) => (
                  <div key={b.label} className="flex flex-1 flex-col items-center justify-end gap-2">
                    <div className="w-full rounded-t-md bg-gradient-to-t from-primary/40 to-primary" style={{ height: `${b.pct}%` }} />
                    <Text size="xs" color="muted">{b.label}</Text>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Phân bổ trạng thái</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-5 grid place-items-center">
                <div className="grid h-[150px] w-[150px] place-items-center rounded-full" style={{ background: DONUT_GRADIENT }}>
                  <div className="grid h-24 w-24 place-items-center rounded-full bg-background">
                    <span className="text-2xl font-extrabold text-foreground">48</span>
                    <Text size="xs" color="muted">tổng việc</Text>
                  </div>
                </div>
              </div>
              {DONUT.map((d) => (
                <div key={d.label} className="flex items-center gap-2 py-1.5">
                  <span className={`h-3 w-3 rounded-sm ${d.className}`} />
                  <Text size="sm" className="flex-1">{d.label}</Text>
                  <Text size="sm" weight="bold" numeric>{d.pct}%</Text>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-5">
          <CardHeader><CardTitle className="text-base">Khối lượng theo thành viên</CardTitle></CardHeader>
          <CardContent>
            {TEAM.map((t) => (
              <div key={t.name} className="flex items-center gap-4 py-2">
                <Avatar fallback={t.name.charAt(0)} size="sm" />
                <Text size="sm" weight="medium" className="w-28 shrink-0">{t.name}</Text>
                <Progress value={t.pct} size="sm" variant="gradient" className="flex-1" />
                <Text size="sm" color="muted" numeric className="w-16 text-right">{t.count} việc</Text>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
