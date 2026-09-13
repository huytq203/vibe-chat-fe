'use client';

import { Area, AreaChart, CartesianGrid, Line, Tooltip, XAxis, YAxis } from 'recharts';
import type { Insights } from '../../../types';
import { Panel, PanelState } from '../../common';
import { ChartFrame, ChartTooltip, SeriesLegend, formatShortDate, useSeriesVisibility } from './ChartFrame';

const series = [
  { key: 'created', label: 'Đã tạo', color: 'var(--chart-1)' },
  { key: 'completed', label: 'Đã xong', color: 'var(--chart-2)' },
  { key: 'open', label: 'Tồn đọng', color: 'var(--primary)' },
] as const;

export function ThroughputArea({ data }: { data: Insights['timeline'] }) {
  const { hidden, toggle } = useSeriesVisibility();
  return (
    <Panel title="Nhịp tạo và hoàn thành">
      {data.length === 0 ? (
        <PanelState>Chưa có biến động công việc trong kỳ này.</PanelState>
      ) : (
        <>
          <SeriesLegend items={series} hidden={hidden} onToggle={toggle} />
          <ChartFrame height={260}>
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis yAxisId="open" orientation="right" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip labelFormatter={formatShortDate} />} />
              <Area type="monotone" dataKey="created" name="Đã tạo" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.16} hide={hidden.has('created')} isAnimationActive={false} />
              <Area type="monotone" dataKey="completed" name="Đã xong" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.18} hide={hidden.has('completed')} isAnimationActive={false} />
              <Line yAxisId="open" type="monotone" dataKey="open" name="Tồn đọng" stroke="var(--primary)" strokeWidth={2} dot={false} hide={hidden.has('open')} isAnimationActive={false} />
            </AreaChart>
          </ChartFrame>
          <p className="px-2 pb-1 text-xs text-muted-foreground">Tồn đọng giảm = tốt</p>
        </>
      )}
    </Panel>
  );
}
