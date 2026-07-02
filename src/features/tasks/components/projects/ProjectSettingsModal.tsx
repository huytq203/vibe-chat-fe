'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog/Dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs/Tabs';
import { Badge } from '@/components/ui/badge/Badge';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import { ProjectInfoTab } from './ProjectInfoTab';
import { ProjectStatusControl } from './ProjectStatusControl';
import { ProjectSharingTab } from './ProjectSharingTab';
import { ProjectTagsTab } from './ProjectTagsTab';
import { SettingsPlaceholder } from './SettingsPlaceholder';
import type { Project } from '../../types';

const TABS = [
  { value: 'info', label: 'Thông tin' },
  { value: 'share', label: 'Chia sẻ' },
  { value: 'powerups', label: 'Tiện ích' },
  { value: 'automations', label: 'Tự động hoá' },
  { value: 'checklists', label: 'Checklist' },
  { value: 'labels', label: 'Nhãn' },
  { value: 'customfields', label: 'Trường tuỳ chỉnh' },
] as const;

export function ProjectSettingsModal({ project }: { project: Project }) {
  const settingsModal = useTasksUIStore((s) => s.settingsModal);
  const closeSettings = useTasksUIStore((s) => s.closeSettings);

  const open = settingsModal.open;
  const defaultTab = settingsModal.open ? settingsModal.tab : 'info';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeSettings()}>
      <DialogContent className="flex max-h-[90dvh] w-full max-w-[720px] flex-col overflow-hidden">
        <div className="mb-4 flex shrink-0 items-center gap-2 pr-8">
          <DialogTitle className="text-lg font-bold">Cài đặt dự án</DialogTitle>
          <Badge variant="soft-primary" size="sm">Dự án nhóm</Badge>
          <ProjectStatusControl project={project} className="ml-auto" />
        </div>

        <Tabs defaultValue={defaultTab} key={defaultTab} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mb-4 max-w-full shrink-0 flex-nowrap overflow-x-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Vùng nội dung tab cuộn riêng để không bị che khi zoom/nội dung dài */}
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <TabsContent value="info">
              <ProjectInfoTab project={project} />
            </TabsContent>
            <TabsContent value="share">
              <ProjectSharingTab project={project} />
            </TabsContent>
            <TabsContent value="labels">
              <ProjectTagsTab project={project} />
            </TabsContent>
            <TabsContent value="powerups">
              <SettingsPlaceholder title="Tiện ích (Power-Ups)" />
            </TabsContent>
            <TabsContent value="automations">
              <SettingsPlaceholder title="Tự động hoá" />
            </TabsContent>
            <TabsContent value="checklists">
              <SettingsPlaceholder title="Mẫu checklist" />
            </TabsContent>
            <TabsContent value="customfields">
              <SettingsPlaceholder title="Trường tuỳ chỉnh" />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
