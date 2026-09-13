'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert/Alert';
import { Button } from '@/components/ui/button/Button';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { useInsights } from '../../../hooks/useReports';
import type { ReportPeriod, StatsOverview } from '../../../types';
import { CompletionHeatmap } from './CompletionHeatmap';
import { CycleScatter } from './CycleScatter';
import { DueBucketsBar } from './DueBucketsBar';
import { GemHistogram } from './GemHistogram';
import { MemberRadar } from './MemberRadar';
import { PipelineFunnel } from './PipelineFunnel';
import { PriorityStack } from './PriorityStack';
import { ProjectHealthRadial } from './ProjectHealthRadial';
import { TagTreemap } from './TagTreemap';
import { ThroughputArea } from './ThroughputArea';

interface InsightsGridProps {
  period: ReportPeriod;
  projectId?: string;
  overview?: StatsOverview;
  isOverviewPending?: boolean;
}

const panelSpans = ['lg:col-span-2', 'lg:col-span-4', 'lg:col-span-2', 'lg:col-span-4', 'lg:col-span-2', 'lg:col-span-2', 'lg:col-span-4', 'lg:col-span-4', 'lg:col-span-2', 'lg:col-span-4'];

export function InsightsGrid({ period, projectId, overview, isOverviewPending = false }: InsightsGridProps) {
  const query = useInsights({ period, projectId });

  if (query.isPending) {
    return (
      <div role="status" aria-label="Đang tải biểu đồ insights" className="grid grid-cols-1 gap-4 lg:grid-cols-6">
        {panelSpans.map((span, index) => (
          <Skeleton key={`${span}-${index}`} className={`h-72 w-full ${span}`} rounded="lg" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Không tải được bộ biểu đồ insights.</AlertTitle>
        <AlertDescription className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <span>Kiểm tra kết nối rồi thử tải lại báo cáo.</span>
          <Button variant="danger-outline" size="sm" onClick={() => void query.refetch()}>
            Thử lại
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!query.data) return null;

  const data = query.data;
  const panels = [
    <ProjectHealthRadial key="health" data={overview} isLoading={isOverviewPending} />,
    <ThroughputArea key="throughput" data={data.timeline} />,
    <PipelineFunnel key="pipeline" data={data.byColumn} />,
    <TagTreemap key="tags" data={data.byTag} />,
    <PriorityStack key="priority" data={data.byPriority} />,
    <GemHistogram key="gems" data={data.gemBuckets} avgGem={data.avgGem} />,
    <CycleScatter key="cycle" data={data.cycleTime} />,
    <MemberRadar key={`members-${period}-${projectId ?? 'all'}`} data={data.workload} />,
    <DueBucketsBar key="due" data={data.dueBuckets} />,
    <CompletionHeatmap key="heat" data={data.weekdayHeat} />,
  ];

  return (
    <section role="region" aria-label="Bộ biểu đồ insights" className="grid grid-cols-1 gap-4 lg:grid-cols-6">
      {panels.map((panel, index) => (
        <div key={panel.key} data-testid="insight-panel" className={panelSpans[index]}>
          {panel}
        </div>
      ))}
    </section>
  );
}
