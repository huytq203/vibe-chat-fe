'use client';

import { useMemo } from 'react';
import { Cell, RadialBar, RadialBarChart, Tooltip } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import type { StatsOverview } from '../../../types';
import { Panel, PanelState } from '../../common';
import { ChartFrame, ChartTooltip } from './ChartFrame';

function getHealthColor(rate: number) {
  if (rate >= 70) return 'var(--chart-2)';
  if (rate >= 40) return 'var(--chart-1)';
  return 'var(--danger)';
}

export function ProjectHealthRadial({ data, isLoading = false }: { data?: StatsOverview; isLoading?: boolean }) {
  const { chartData, average } = useMemo(() => {
    const projects = data?.projects ?? [];
    const avg = projects.length > 0
      ? Math.round(projects.reduce((total, project) => total + project.completionRate, 0) / projects.length)
      : 0;
    return { chartData: projects, average: avg };
  }, [data?.projects]);

  return (
    <Panel title="Sức khỏe dự án">
      {isLoading ? (
        <div role="status" aria-label="Đang tải sức khỏe dự án" className="px-2 pb-2">
          <Skeleton className="h-[250px] w-full" rounded="lg" />
        </div>
      ) : chartData.length === 0 ? (
        <PanelState>Chưa có dự án để đánh giá sức khỏe.</PanelState>
      ) : (
        <ChartFrame height={250}>
          <RadialBarChart data={chartData} innerRadius="28%" outerRadius="92%" startAngle={90} endAngle={-270}>
            <RadialBar
              dataKey="completionRate"
              name="Hoàn thành"
              background={{ fill: 'var(--muted)' }}
              cornerRadius={5}
              isAnimationActive={false}
            >
              {chartData.map((project) => (
                <Cell key={project.projectId} fill={getHealthColor(project.completionRate)} />
              ))}
            </RadialBar>
            <Tooltip content={<ChartTooltip />} />
            <text x="50%" y="48%" textAnchor="middle" fill="var(--foreground)" className="text-xl font-bold tabular-nums">
              {average}%
            </text>
            <text x="50%" y="57%" textAnchor="middle" fill="var(--muted-foreground)" className="text-[10px]">
              trung bình
            </text>
          </RadialBarChart>
        </ChartFrame>
      )}
    </Panel>
  );
}
