'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, Tooltip, XAxis, YAxis } from 'recharts';
import type { StatsOverview } from '../../../types';
import { Panel, PanelState } from '../../common';
import { ChartFrame, ChartTooltip, SeriesLegend, useSeriesVisibility } from './ChartFrame';

const series = [
  { key: 'completed', label: 'Xong', color: 'var(--chart-2)' },
  { key: 'inProgress', label: 'Đang làm', color: 'var(--chart-1)' },
  { key: 'notStarted', label: 'Chưa bắt đầu', color: 'var(--chart-3)' },
  { key: 'overdue', label: 'Quá hạn', color: 'var(--danger)' },
] as const;

export function ProjectProgressChart({ data }: { data: StatsOverview }) {
  const { hidden, toggle } = useSeriesVisibility();
  const chartData = useMemo(
    () =>
      data.projects.map((project) => ({
        name: project.projectName,
        completed: project.completedTasks,
        inProgress: project.inProgressTasks,
        notStarted: Math.max(
          0,
          project.totalTasks - project.completedTasks - project.inProgressTasks - project.overdueTasks,
        ),
        overdue: project.overdueTasks,
        total: project.totalTasks,
        completionLabel: `${project.completionRate}%`,
      })),
    [data.projects],
  );

  return (
    <Panel title="Tiến độ hoàn thành theo dự án">
      {chartData.length === 0 ? (
        <PanelState>Chưa có dự án nào để thống kê.</PanelState>
      ) : (
        <>
          <SeriesLegend items={series} hidden={hidden} onToggle={toggle} />
          <ChartFrame height={Math.max(190, chartData.length * 44)}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 42, bottom: 4, left: 4 }}>
              <CartesianGrid stroke="var(--border)" strokeOpacity={0.5} horizontal={false} />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={92}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.35 }} />
              {series.map((item, index) => (
                <Bar
                  key={item.key}
                  dataKey={item.key}
                  name={item.label}
                  stackId="progress"
                  fill={item.color}
                  hide={hidden.has(item.key)}
                  radius={index === series.length - 1 ? [0, 5, 5, 0] : 0}
                  isAnimationActive={false}
                >
                </Bar>
              ))}
              <Bar dataKey="total" fill="transparent" isAnimationActive={false} legendType="none">
                <LabelList
                  dataKey="completionLabel"
                  position="right"
                  fill="var(--muted-foreground)"
                  fontSize={11}
                />
              </Bar>
            </BarChart>
          </ChartFrame>
        </>
      )}
    </Panel>
  );
}
