'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import type { Insights } from '../../../types';
import { Panel, PanelState } from '../../common';
import { ChartFrame, ChartTooltip, SeriesLegend, useSeriesVisibility } from './ChartFrame';

const priorityOrder = ['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE'] as const;
const priorityLabels: Record<(typeof priorityOrder)[number], string> = {
  URGENT: 'Khẩn',
  HIGH: 'Cao',
  MEDIUM: 'Vừa',
  LOW: 'Thấp',
  NONE: 'Chưa đặt',
};
const series = [
  { key: 'completed', label: 'Xong', color: 'var(--chart-2)' },
  { key: 'remaining', label: 'Còn lại', color: 'var(--chart-1)' },
  { key: 'overdue', label: 'Quá hạn', color: 'var(--danger)' },
] as const;

export function PriorityStack({ data }: { data: Insights['byPriority'] }) {
  const { hidden, toggle } = useSeriesVisibility();
  const chartData = useMemo(
    () =>
      priorityOrder.map((priority) => {
        const item = data.find((entry) => entry.priority === priority);
        return {
          priority: priorityLabels[priority],
          completed: item?.completed ?? 0,
          remaining: Math.max(0, (item?.total ?? 0) - (item?.completed ?? 0) - (item?.overdue ?? 0)),
          overdue: item?.overdue ?? 0,
        };
      }),
    [data],
  );
  const hasData = data.some((item) => item.total > 0);

  return (
    <Panel title="Theo mức ưu tiên">
      {!hasData ? (
        <PanelState>Chưa có công việc để phân tích ưu tiên.</PanelState>
      ) : (
        <>
          <SeriesLegend items={series} hidden={hidden} onToggle={toggle} />
          <ChartFrame height={240}>
            <BarChart data={chartData} margin={{ top: 6, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="priority" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              {series.map((item) => (
                <Bar key={item.key} dataKey={item.key} name={item.label} stackId="priority" fill={item.color} hide={hidden.has(item.key)} isAnimationActive={false} />
              ))}
            </BarChart>
          </ChartFrame>
        </>
      )}
    </Panel>
  );
}
