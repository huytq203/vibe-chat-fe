'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import { ScrollArea } from '@/components/ui/scroll-area/ScrollArea';
import { useProjects } from '../../hooks/useProjects';
import { getViewTitle } from '../../lib/view-title';
import { PageHeading } from '../common';
import { ProjectList } from './ProjectList';
import { NewProjectModal } from './NewProjectModal';

export function ProjectsPage() {
  const { data: projects, isLoading, isError } = useProjects();
  const [newOpen, setNewOpen] = useState(false);
  const count = projects?.length ?? 0;
  const { title, sub } = getViewTitle('projects');

  return (
    <ScrollArea className="h-full w-full">
      <div className="mx-auto w-full max-w-5xl px-7 py-8">
        <PageHeading title={title} sub={sub} />

        <div className="mb-5 flex items-center gap-3">
          <Badge variant="soft-primary" size="md">Tất cả dự án · {count}</Badge>
          <div className="flex-1" />
          <Button variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setNewOpen(true)}>
            Dự án mới
          </Button>
        </div>

        <ProjectList projects={projects ?? []} isLoading={isLoading} isError={isError} />
      </div>

      <NewProjectModal open={newOpen} onOpenChange={setNewOpen} />
    </ScrollArea>
  );
}
