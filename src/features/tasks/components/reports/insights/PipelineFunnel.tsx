'use client';

import { useMemo } from 'react';
import { Cell, Funnel, FunnelChart, LabelList, Tooltip } from 'recharts';
import type { Insights } from '../../../types';
import { Panel, PanelState } from '../../common';
import { ChartFrame, ChartTooltip, chartColors } from './ChartFrame';

export function PipelineFunnel({ data }: { data: Insights['byColumn'] }) {
  const chartData = useMemo(
    () => [...data].sort((left, right) => left.position - right.position),
    [data],
  );
  return (
    <Panel title="Luồng công việc">
      {chartData.length < 2 ? (
        <PanelState>Board chưa có đủ cột để vẽ luồng.</PanelState>
      ) : (
        <ChartFrame height={250}>
          <FunnelChart>
            <Tooltip content={<ChartTooltip />} />
            <Funnel data={chartData} dataKey="count" nameKey="name" isAnimationActive={false}>
              {chartData.map((column, index) => (
                <Cell key={column.columnId} fill={chartColors[index % chartColors.length]} />
              ))}
              <LabelList position="right" dataKey="name" fill="var(--foreground)" fontSize={11} />
              <LabelList position="center" dataKey="count" fill="var(--primary-foreground)" fontSize={11} />
            </Funnel>
          </FunnelChart>
        </ChartFrame>
      )}
    </Panel>
  );
}
