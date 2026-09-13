'use client';

import { useMemo } from 'react';
import { Bar, BarChart, Cell, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import type { Insights } from '../../../types';
import { Panel, PanelState } from '../../common';
import { ChartFrame, ChartTooltip } from './ChartFrame';

const bucketOrder = ['overdue', 'today', 'thisWeek', 'later', 'none'] as const;
const bucketLabels: Record<(typeof bucketOrder)[number], string> = {
  overdue: 'Quá hạn',
  today: 'Hôm nay',
  thisWeek: 'Tuần này',
  later: 'Sau',
  none: 'Không hạn',
};

export function DueBucketsBar({ data }: { data: Insights['dueBuckets'] }) {
  const chartData = useMemo(
    () =>
      bucketOrder.map((bucket) => ({
        bucket,
        label: bucketLabels[bucket],
        count: data.find((entry) => entry.bucket === bucket)?.count ?? 0,
      })),
    [data],
  );
  const hasData = chartData.some((item) => item.count > 0);
  return (
    <Panel title="Hạn công việc">
      {!hasData ? (
        <PanelState>Chưa có công việc mang ngày hạn trong kỳ này.</PanelState>
      ) : (
        <ChartFrame height={240}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 6 }}>
            <CartesianGrid stroke="var(--border)" strokeOpacity={0.5} horizontal={false} />
            <XAxis type="number" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="label" width={68} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="count" name="Số việc" radius={[0, 5, 5, 0]} isAnimationActive={false}>
              {chartData.map((item) => (
                <Cell key={item.bucket} fill={item.bucket === 'overdue' ? 'var(--danger)' : 'var(--chart-2)'} />
              ))}
            </Bar>
          </BarChart>
        </ChartFrame>
      )}
    </Panel>
  );
}
