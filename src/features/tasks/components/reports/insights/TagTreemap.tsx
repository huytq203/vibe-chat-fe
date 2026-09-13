'use client';

import { Tooltip, Treemap, type TooltipContentProps, type TreemapNode } from 'recharts';
import type { Insights } from '../../../types';
import { Panel, PanelState } from '../../common';
import { ChartFrame } from './ChartFrame';

interface TagNodeData {
  [key: string]: unknown;
  name: string;
  total: number;
  completed: number;
  color: string;
  completionRate: number;
}

function isTagNodeData(value: unknown): value is TagNodeData {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Partial<TagNodeData>;
  return typeof entry.name === 'string' && typeof entry.total === 'number';
}

function TagCell(node: TreemapNode) {
  const color = typeof node.color === 'string' ? node.color : 'var(--chart-2)';
  const completionRate = typeof node.completionRate === 'number' ? node.completionRate : 0;
  const showLabel = node.depth === 1 && node.width > 66 && node.height > 34;
  return (
    <g>
      <rect
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
        rx={6}
        fill={color}
        fillOpacity={0.35 + completionRate * 0.006}
        stroke="var(--background)"
        strokeWidth={3}
      />
      {showLabel && (
        <text x={node.x + 8} y={node.y + 18} fill="var(--foreground)" fontSize={11} fontWeight={600}>
          {node.name}
        </text>
      )}
    </g>
  );
}

function TagTooltip({ active, payload }: TooltipContentProps) {
  const item = payload?.[0]?.payload as unknown;
  if (!active || !isTagNodeData(item)) return null;
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-[var(--shadow-subtle)]">
      <p className="font-semibold">{item.name}</p>
      <p className="mt-1 text-muted-foreground">
        Tổng <span className="font-semibold tabular-nums text-foreground">{item.total}</span> · Xong{' '}
        <span className="font-semibold tabular-nums text-foreground">{item.completed}</span> ·{' '}
        <span className="font-semibold tabular-nums text-foreground">{item.completionRate}%</span>
      </p>
    </div>
  );
}

export function TagTreemap({ data }: { data: Insights['byTag'] }) {
  const chartData: TagNodeData[] = data.map((tag) => ({
    name: tag.name,
    total: tag.total,
    completed: tag.completed,
    color: tag.color,
    completionRate: tag.total > 0 ? Math.round((tag.completed / tag.total) * 100) : 0,
  }));

  return (
    <Panel title="Phân bổ theo nhãn">
      {chartData.length === 0 ? (
        <PanelState>Chưa có nhãn nào được dùng trong kỳ này.</PanelState>
      ) : (
        <ChartFrame height={250}>
          <Treemap data={chartData} dataKey="total" nameKey="name" content={TagCell} isAnimationActive={false}>
            <Tooltip content={TagTooltip} />
          </Treemap>
        </ChartFrame>
      )}
    </Panel>
  );
}
