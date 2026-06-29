'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card } from '@/components/ui/card/Card';
import { Button } from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import { Text } from '@/components/ui/typography/Typography';
import { ScrollArea } from '@/components/ui/scroll-area/ScrollArea';
import { useProjects } from '../hooks/useProjects';
import { ProjectTableRow } from './projects/ProjectTableRow';
import { NewProjectModal } from './NewProjectModal';

const HEADERS = ['Tên dự án', 'Tiến độ', 'Việc mở', 'Thành viên', 'Trạng thái'];

export function ProjectsPage() {
  const { data: projects, isLoading, isError } = useProjects();
  const [newOpen, setNewOpen] = useState(false);
  const count = projects?.length ?? 0;

  return (
    <ScrollArea className="h-full w-full">
      <div className="mx-auto w-full max-w-5xl px-7 py-8">
        <div className="mb-5 flex items-center gap-3">
          <Badge variant="soft-primary" size="md">Tất cả dự án · {count}</Badge>
          <div className="flex-1" />
          <Button variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setNewOpen(true)}>
            Dự án mới
          </Button>
        </div>

        <Card padding="none" className="overflow-hidden">
          <div className="grid grid-cols-[2fr_1.3fr_90px_130px_120px] gap-4 border-b border-border bg-muted px-6 py-4">
            {HEADERS.map((h) => (
              <span key={h} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</span>
            ))}
          </div>

          {isLoading && <div className="px-6 py-8"><Text size="sm" color="muted">Đang tải dự án…</Text></div>}
          {isError && <div className="px-6 py-8"><Text size="sm" color="muted">Không tải được danh sách dự án.</Text></div>}
          {!isLoading && !isError && count === 0 && (
            <div className="px-6 py-8"><Text size="sm" color="muted">Chưa có dự án. Bấm &quot;Dự án mới&quot; để tạo.</Text></div>
          )}
          {(projects ?? []).map((p) => (
            <ProjectTableRow key={p.id} project={p} />
          ))}
        </Card>
      </div>

      <NewProjectModal open={newOpen} onOpenChange={setNewOpen} />
    </ScrollArea>
  );
}
