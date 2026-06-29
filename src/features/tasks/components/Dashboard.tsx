'use client';

import { CheckCircle2, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card/Card';
import { Text } from '@/components/ui/typography/Typography';
import { ScrollArea } from '@/components/ui/scroll-area/ScrollArea';
import { useProjects } from '../hooks/useProjects';
import { DashboardProjectRow } from './dashboard/DashboardProjectRow';

function ComingSoonPanel({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </span>
      <Text weight="medium">{title}</Text>
      <Text size="sm" color="muted">{desc}</Text>
    </div>
  );
}

export function Dashboard() {
  const { data: projects, isLoading, isError } = useProjects();

  return (
    <ScrollArea className="h-full w-full">
      <div className="mx-auto w-full max-w-5xl px-7 py-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nhiệm vụ của bạn</CardTitle>
            </CardHeader>
            <CardContent>
              <ComingSoonPanel
                icon={<CheckCircle2 className="h-6 w-6" />}
                title="Chưa có nhiệm vụ được giao"
                desc="Danh sách việc của bạn sẽ xuất hiện ở đây."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Hoạt động</CardTitle>
            </CardHeader>
            <CardContent>
              <ComingSoonPanel
                icon={<Bell className="h-6 w-6" />}
                title="Yên bình quá…"
                desc="Chưa có hoạt động nào."
              />
            </CardContent>
          </Card>
        </div>

        <Card className="mt-5">
          <CardHeader>
            <CardTitle className="text-base">Dự án</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {isLoading && <Text size="sm" color="muted">Đang tải dự án…</Text>}
            {isError && <Text size="sm" color="muted">Không tải được danh sách dự án.</Text>}
            {!isLoading && !isError && (projects?.length ?? 0) === 0 && (
              <Text size="sm" color="muted">Chưa có dự án. Bấm "Tạo mới" để bắt đầu.</Text>
            )}
            <div className="flex flex-col">
              {(projects ?? []).map((p) => (
                <DashboardProjectRow key={p.id} project={p} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
