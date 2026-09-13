'use client';

import { ComboBox } from '@/components/ui/combobox/ComboBox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs/Tabs';
import type { Project, ReportPeriod } from '../../types';

interface ReportsFiltersProps {
  period: ReportPeriod;
  projectId?: string;
  projects: Project[];
  isLoadingProjects: boolean;
  onPeriodChange: (period: ReportPeriod) => void;
  onProjectChange: (projectId?: string) => void;
}

const ALL_PROJECTS_VALUE = '__all_projects__';

export function ReportsFilters({
  period,
  projectId,
  projects,
  isLoadingProjects,
  onPeriodChange,
  onProjectChange,
}: ReportsFiltersProps) {
  const projectOptions = [
    { value: ALL_PROJECTS_VALUE, label: 'Tất cả project' },
    ...projects.map((project) => ({ value: project.id, label: project.name })),
  ];

  return (
    <div className="flex flex-col gap-4 border-b border-border/70 px-4 py-5 md:flex-row md:items-center md:justify-between md:px-6">
      <h1 className="text-xl font-bold leading-tight tracking-tight text-foreground">Báo cáo</h1>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <ComboBox
          ref={(node) => node?.setAttribute('aria-label', 'Project')}
          value={projectId ?? ALL_PROJECTS_VALUE}
          options={projectOptions}
          onValueChange={(value) => {
            const nextValue = Array.isArray(value) ? value[0] : value;
            onProjectChange(nextValue === ALL_PROJECTS_VALUE ? undefined : nextValue);
          }}
          isLoading={isLoadingProjects}
          placeholder="Chọn project"
          emptyText="Không tìm thấy project."
          clearIcon={false}
          className="w-full sm:w-60 [&_[role=combobox]]:min-h-11 [&_[role=group]:focus-within]:ring-2 [&_[role=group]:focus-within]:ring-ring [&_[role=group]:focus-within]:ring-offset-2 md:[&_[role=combobox]]:min-h-10"
        />

        <Tabs
          value={period}
          onValueChange={(value) => onPeriodChange(value as ReportPeriod)}
          aria-label="Kỳ báo cáo"
        >
          <TabsList
            className="w-full [&_[role=presentation]]:transition-none [&_[role=tab][data-active]]:text-primary sm:w-auto"
            size="sm"
          >
            <TabsTrigger value="week" className="min-h-11 flex-1 px-4 md:min-h-9">
              Tuần
            </TabsTrigger>
            <TabsTrigger value="month" className="min-h-11 flex-1 px-4 md:min-h-9">
              Tháng
            </TabsTrigger>
            <TabsTrigger value="all" className="min-h-11 flex-1 px-4 md:min-h-9">
              Tất cả
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
