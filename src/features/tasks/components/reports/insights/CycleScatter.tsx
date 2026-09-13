'use client';

import { useMemo } from 'react';
import { CartesianGrid, Cell, Scatter, ScatterChart, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts';
import type { Insights } from '../../../types';
import { Panel, PanelState } from '../../common';
import { ChartFrame } from './ChartFrame';

type CycleItem = Insights['cycleTime'][number] & { gem: number };

function isCycleItem(value: unknown): value is CycleItem {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Partial<CycleItem>;
  return typeof entry.title === 'string' && typeof entry.projectName === 'string' && typeof entry.days === 'number';
}

function CycleTooltip({ active, payload }: TooltipContentProps) {
  const item = payload?.[0]?.payload as unknown;
  if (!active || !isCycleItem(item)) return null;
  const dueLabel = item.onTime === null ? 'Chưa xác định' : item.onTime ? 'Đúng hạn' : 'Trễ hạn';
  return (
    <div className="max-w-64 rounded-xl border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-[var(--shadow-subtle)]">
      <p className="truncate font-semibold">{item.title}</p>
      <p className="mt-1 text-muted-foreground">{item.projectName}</p>
      <p className="mt-1 tabular-nums">{item.gem} gem · {item.days} ngày · {dueLabel}</p>
    </div>
  );
}

function getPointColor(onTime: boolean | null) {
  if (onTime === false) return 'var(--danger)';
  if (onTime === null) return 'var(--muted-foreground)';
  return 'var(--chart-2)';
}

export function CycleScatter({ data }: { data: Insights['cycleTime'] }) {
  const { chartData, skipped } = useMemo(() => {
    const recent = data.slice(-300);
    return {
      chartData: recent.filter((item): item is CycleItem => item.gem !== null),
      skipped: recent.filter((item) => item.gem === null).length,
    };
  }, [data]);

  return (
    <Panel title="Gem và thời gian hoàn thành">
      {chartData.length === 0 ? (
        <PanelState>Chưa có task đã chấm gem để so sánh chu kỳ.</PanelState>
      ) : (
        <>
          <ChartFrame height={250}>
            <ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: -14 }}>
              <CartesianGrid stroke="var(--border)" strokeOpacity={0.5} />
              <XAxis type="number" dataKey="gem" name="Gem" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="number" dataKey="days" name="Số ngày" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={CycleTooltip} />
              <Scatter data={chartData} name="Task" isAnimationActive={false}>
                {chartData.map((item) => (
                  <Cell key={item.taskId} fill={getPointColor(item.onTime)} />
                ))}
              </Scatter>
            </ScatterChart>
          </ChartFrame>
          <p className="px-2 pb-1 text-xs text-muted-foreground tabular-nums">
            Hiển thị tối đa 300 task gần nhất · bỏ qua {skipped} task chưa chấm gem.
          </p>
        </>
      )}
    </Panel>
  );
}
