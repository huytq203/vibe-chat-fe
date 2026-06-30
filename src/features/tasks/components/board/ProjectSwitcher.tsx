'use client';

import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/Popover';
import { cn } from '@/lib/utils/cn';
import { useProjects } from '../../hooks/useProjects';
import { useTasksUIStore } from '../../stores/tasks-ui.store';

interface ProjectSwitcherProps {
  selectedProjectId: string;
  selectedName: string;
}

export function ProjectSwitcher({ selectedProjectId, selectedName }: ProjectSwitcherProps) {
  const { data: projects = [], isLoading, isError } = useProjects();
  const setSelectedProjectId = useTasksUIStore((s) => s.setSelectedProjectId);
  const [open, setOpen] = useState(false);

  const handleSelect = (id: string) => {
    setSelectedProjectId(id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <button
          type="button"
          aria-label="Chuyển dự án"
          className="-mx-1 flex min-w-0 items-center gap-2 rounded-lg px-1 hover:bg-muted"
        >
          <h1 className="truncate text-2xl font-bold leading-tight text-foreground">{selectedName}</h1>
          <ChevronDown
            className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-64 p-1.5" align="start" showArrow={false}>
        <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Chuyển dự án
        </p>

        {isLoading ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">Đang tải…</p>
        ) : isError ? (
          <p className="px-2 py-3 text-sm text-destructive">Không tải được danh sách dự án.</p>
        ) : projects.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">Chưa có dự án nào.</p>
        ) : (
          <ul className="max-h-72 overflow-y-auto">
            {projects.map((p) => {
              const isActive = p.id === selectedProjectId;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(p.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted',
                      isActive ? 'font-semibold text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    <span className="flex-1 truncate">{p.name}</span>
                    {isActive && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
