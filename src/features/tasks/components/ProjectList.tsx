'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button/Button';
import { useProjects } from '../hooks/useProjects';
import { useCreateProject } from '../hooks/useCreateProject';
import { useTasksUIStore } from '../stores/tasks-ui.store';

export function ProjectList() {
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const selectedId = useTasksUIStore((s) => s.selectedProjectId);
  const setSelected = useTasksUIStore((s) => s.setSelectedProjectId);
  const [name, setName] = useState('');

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed || createProject.isPending) return;
    try {
      const project = await createProject.mutateAsync({ name: trimmed });
      setName('');
      setSelected(project.id);
    } catch {
      // Lỗi đã được phản ánh qua createProject.isError; giữ nguyên text để user thử lại.
    }
  };

  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="flex items-center gap-2 border-b border-border p-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleCreate();
          }}
          placeholder="Tên project mới…"
          className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary"
        />
        <Button
          size="icon"
          onClick={() => void handleCreate()}
          isLoading={createProject.isPending}
          aria-label="Tạo project"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && <p className="p-2 text-sm text-muted-foreground">Đang tải…</p>}
        {createProject.isError && (
          <p className="p-2 text-sm text-danger">Tạo project thất bại. Thử lại.</p>
        )}
        {projects?.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelected(p.id)}
            className={cn(
              'mb-1 w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors',
              selectedId === p.id ? 'bg-primary/15 text-primary' : 'hover:bg-muted',
            )}
          >
            {p.name}
          </button>
        ))}
        {projects?.length === 0 && !isLoading && (
          <p className="p-2 text-sm text-muted-foreground">Chưa có project. Tạo mới ở trên.</p>
        )}
      </div>
    </div>
  );
}
