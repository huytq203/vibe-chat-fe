'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs/Tabs';
import { SettingsPlaceholder } from '../projects/SettingsPlaceholder';
import { ClientTab } from './ClientTab';

const TABS = [
  { value: 'client', label: 'Khách hàng' },
  { value: 'scope', label: 'Phạm vi' },
  { value: 'commitments', label: 'Cam kết' },
  { value: 'change-requests', label: 'Yêu cầu thay đổi' },
] as const;

export function CommitmentGraphView({ projectId }: { projectId: string }) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <Tabs defaultValue="client" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-4 mt-3 max-w-full shrink-0 flex-nowrap overflow-x-auto sm:mx-5">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <TabsContent value="client">
            <ClientTab projectId={projectId} />
          </TabsContent>
          <TabsContent value="scope">
            <SettingsPlaceholder title="Phạm vi" />
          </TabsContent>
          <TabsContent value="commitments">
            <SettingsPlaceholder title="Danh sách cam kết" />
          </TabsContent>
          <TabsContent value="change-requests">
            <SettingsPlaceholder title="Yêu cầu thay đổi" />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
