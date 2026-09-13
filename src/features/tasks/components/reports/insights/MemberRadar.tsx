'use client';

import { useMemo, useState } from 'react';
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button/Button';
import type { Insights } from '../../../types';
import { Panel, PanelState } from '../../common';
import { ChartFrame, ChartTooltip, chartColors } from './ChartFrame';

const metrics = [
  { key: 'completed', label: 'Việc xong', invert: false },
  { key: 'gems', label: 'Gem', invert: false },
  { key: 'onTimeRate', label: 'Đúng hạn %', invert: false },
  { key: 'open', label: 'Đang gánh', invert: false },
  { key: 'overdue', label: 'Quá hạn', invert: true },
] as const;

type WorkloadItem = Insights['workload'][number];
type MetricKey = (typeof metrics)[number]['key'];

function getMetricValue(member: WorkloadItem, key: MetricKey) {
  const value = member[key];
  return value ?? 0;
}

export function MemberRadar({ data }: { data: Insights['workload'] }) {
  const defaults = useMemo(
    () => [...data].sort((left, right) => right.gems - left.gems).slice(0, 3).map((member) => member.userId),
    [data],
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(defaults));
  const selected = data.filter((member) => selectedIds.has(member.userId));
  const chartData = useMemo(() => {
    const maximums = Object.fromEntries(
      metrics.map((metric) => [metric.key, Math.max(1, ...data.map((member) => getMetricValue(member, metric.key)))]),
    ) as Record<MetricKey, number>;
    return metrics.map((metric) => {
      const row: Record<string, string | number> = { metric: metric.label };
      selected.forEach((member) => {
        const normalized = Math.round((getMetricValue(member, metric.key) / maximums[metric.key]) * 100);
        row[member.userId] = metric.invert ? 100 - normalized : normalized;
      });
      return row;
    });
  }, [data, selected]);

  const toggleMember = (userId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else if (next.size < 5) next.add(userId);
      return next;
    });
  };

  return (
    <Panel title="So sánh thành viên">
      {data.length === 0 ? (
        <PanelState>Chưa có dữ liệu thành viên trong kỳ này.</PanelState>
      ) : (
        <>
          <div aria-label="Chọn thành viên" className="flex flex-wrap gap-1.5 px-2 pb-2">
            {data.map((member) => {
              const isSelected = selectedIds.has(member.userId);
              return (
                <Button
                  key={member.userId}
                  type="button"
                  variant="outline"
                  size="xs"
                  aria-pressed={isSelected}
                  disabled={!isSelected && selectedIds.size >= 5}
                  onClick={() => toggleMember(member.userId)}
                  className="h-7 min-h-7 border-border px-2 text-xs md:min-h-7"
                >
                  {member.displayName}
                </Button>
              );
            })}
          </div>
          <ChartFrame height={280}>
            <RadarChart data={chartData} outerRadius="72%">
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
              <Tooltip content={<ChartTooltip />} />
              {selected.map((member, index) => (
                <Radar
                  key={member.userId}
                  dataKey={member.userId}
                  name={member.displayName}
                  stroke={chartColors[index % chartColors.length]}
                  fill={chartColors[index % chartColors.length]}
                  fillOpacity={0.1}
                  isAnimationActive={false}
                />
              ))}
            </RadarChart>
          </ChartFrame>
          <p className="px-2 pb-1 text-xs text-muted-foreground">Quá hạn được đảo chiều: ít việc trễ hơn là tốt hơn.</p>
        </>
      )}
    </Panel>
  );
}
