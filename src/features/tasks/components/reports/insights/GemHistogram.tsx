'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import type { Insights } from '../../../types';
import { Panel, PanelState } from '../../common';
import { ChartFrame, ChartTooltip, SeriesLegend, useSeriesVisibility } from './ChartFrame';

const bucketOrder = ['1-20', '21-40', '41-60', '61-80', '81-100', 'none'] as const;
const series = [
  { key: 'completed', label: 'Xong', color: 'var(--chart-2)' },
  { key: 'remaining', label: 'Chưa xong', color: 'var(--chart-1)' },
] as const;

function getAverageBucket(avgGem: number | null) {
  if (avgGem === null) return null;
  if (avgGem <= 20) return '1-20';
  if (avgGem <= 40) return '21-40';
  if (avgGem <= 60) return '41-60';
  if (avgGem <= 80) return '61-80';
  return '81-100';
}

export function GemHistogram({ data, avgGem }: { data: Insights['gemBuckets']; avgGem: number | null }) {
  const { hidden, toggle } = useSeriesVisibility();
  const averageBucket = getAverageBucket(avgGem);
  const chartData = useMemo(
    () =>
      bucketOrder
        .map((bucket) => {
          const item = data.find((entry) => entry.bucket === bucket);
          return item
            ? {
                bucket,
                label: bucket === 'none' ? 'Chưa chấm' : bucket,
                completed: item.completed,
                remaining: Math.max(0, item.total - item.completed),
              }
            : null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    [data],
  );

  return (
    <Panel title="Phân bổ gem">
      {chartData.length === 0 ? (
        <PanelState>Chưa có dữ liệu gem trong kỳ này.</PanelState>
      ) : (
        <>
          <SeriesLegend items={series} hidden={hidden} onToggle={toggle} />
          <div className="sr-only" aria-label="Các khoảng gem">
            {chartData.map((item) => (
              <span key={item.bucket} data-gem-bucket={item.bucket} aria-label={item.label} />
            ))}
          </div>
          <ChartFrame height={240}>
            <BarChart data={chartData} margin={{ top: 16, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              {averageBucket !== null && chartData.some((item) => item.bucket === averageBucket) && <ReferenceLine x={averageBucket} stroke="var(--primary)" strokeDasharray="4 3" label={{ value: `TB ${avgGem}`, fill: 'var(--muted-foreground)', fontSize: 10, position: 'top' }} />}
              {series.map((item) => (
                <Bar key={item.key} dataKey={item.key} name={item.label} stackId="gem" fill={item.color} hide={hidden.has(item.key)} isAnimationActive={false} />
              ))}
            </BarChart>
          </ChartFrame>
        </>
      )}
    </Panel>
  );
}
