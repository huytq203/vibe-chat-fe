'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import { ScrollArea } from '@/components/ui/scroll-area/ScrollArea';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useProjectsInfinite } from '../../hooks/useProjectsInfinite';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import { getViewTitle } from '../../lib/view-title';
import { PageHeading } from '../common';
import { ProjectList } from './ProjectList';
import { NewProjectModal } from './NewProjectModal';

export function ProjectsPage() {
  // Từ khoá tìm nhập ở AppHeader (store) — dùng chung với Dashboard.
  const projectSearch = useTasksUIStore((s) => s.projectSearch);
  const debounced = useDebouncedValue(projectSearch, 300);
  const query = useProjectsInfinite(debounced);
  const [newOpen, setNewOpen] = useState(false);
  const { title, sub } = getViewTitle('projects');

  const projects = query.data?.pages.flatMap((p) => p.data) ?? [];
  const total = query.data?.pages[0]?.meta.total ?? projects.length;

  return (
    <ScrollArea className="h-full w-full">
      <div className="mx-auto w-full max-w-5xl px-7 py-8">
        <PageHeading title={title} sub={sub} />

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <Badge variant="soft-primary" size="md">
            {debounced.trim() ? `Kết quả “${debounced.trim()}” · ${total}` : `Tất cả dự án · ${total}`}
          </Badge>
          <div className="flex-1" />
          <Button
            variant="outline"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setNewOpen(true)}
          >
            Dự án mới
          </Button>
        </div>

        <ProjectList
          projects={projects}
          isLoading={query.isLoading}
          isError={query.isError}
          isSearching={debounced.trim().length > 0}
          hasNextPage={query.hasNextPage}
          isFetchingNextPage={query.isFetchingNextPage}
          onLoadMore={() => void query.fetchNextPage()}
        />
      </div>

      <NewProjectModal open={newOpen} onOpenChange={setNewOpen} />
    </ScrollArea>
  );
}
