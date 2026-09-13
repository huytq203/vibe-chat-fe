'use client';

import { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip/Tooltip';
import { cn } from '@/lib/utils/cn';
import type { Insights } from '../../../types';
import { Panel, PanelState } from '../../common';
import { formatShortDate } from './ChartFrame';

const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const opacityClasses = ['opacity-[0.08]', 'opacity-25', 'opacity-45', 'opacity-70', 'opacity-100'];

export function CompletionHeatmap({ data }: { data: Insights['weekdayHeat'] }) {
  const maximum = Math.max(0, ...data.map((item) => item.completed));
  const total = useMemo(() => data.reduce((sum, item) => sum + item.completed, 0), [data]);
  if (data.length === 0) {
    return (
      <Panel title="Nhịp hoàn thành 13 tuần">
        <PanelState>Chưa có lịch sử hoàn thành trong 13 tuần gần đây.</PanelState>
      </Panel>
    );
  }
  return (
    <Panel title="Nhịp hoàn thành 13 tuần">
      <div role="img" aria-label={`Tổng ${total} việc hoàn thành trong 13 tuần`} className="overflow-x-auto px-2 pb-2 pt-1">
        <div className="grid min-w-[236px] grid-cols-[22px_1fr] gap-2">
          <div className="grid grid-rows-7 gap-1">
            {dayLabels.map((label) => <span key={label} className="h-3 text-[10px] leading-3 text-muted-foreground">{label}</span>)}
          </div>
          <div className="grid grid-flow-col grid-rows-7 gap-1">
            {data.slice(0, 91).map((item) => {
              const level = maximum === 0 ? 0 : Math.min(4, Math.ceil((item.completed / maximum) * 4));
              const label = `${formatShortDate(item.date)}: ${item.completed} việc xong`;
              return (
                <Tooltip key={item.date}>
                  <TooltipTrigger
                    render={
                      <span
                        data-heat-cell
                        aria-label={label}
                        tabIndex={0}
                        className={cn('h-3 w-3 rounded-sm bg-chart-2 outline-none focus-visible:ring-2 focus-visible:ring-ring', opacityClasses[level])}
                      />
                    }
                  />
                  <TooltipContent>{label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
    </Panel>
  );
}
