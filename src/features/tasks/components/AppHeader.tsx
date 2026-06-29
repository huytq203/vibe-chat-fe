'use client';

import { Bell, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import type { ActiveView } from '../stores/tasks-ui.store';
import type { Project } from '../types';

interface AppHeaderProps {
  activeView: ActiveView;
  selectedProject?: Project;
  onCreateProject: () => void;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Chào buổi sáng';
  if (h >= 12 && h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

export function headerTitle(
  activeView: ActiveView,
  project?: Project,
): { title: string; sub: string } {
  switch (activeView) {
    case 'home':
      return { title: 'Trang chủ', sub: greeting() };
    case 'projects':
      return { title: 'Dự án', sub: 'Tổng quan tất cả dự án' };
    case 'reports':
      return { title: 'Báo cáo', sub: 'Thống kê & phân tích' };
    case 'board':
      return {
        title: project?.name ?? 'Nhiệm vụ',
        sub: project?.description ?? 'Board dự án',
      };
  }
}

export function AppHeader({ activeView, selectedProject, onCreateProject }: AppHeaderProps) {
  const { title, sub } = headerTitle(activeView, selectedProject);

  return (
    <header className="flex h-[66px] shrink-0 items-center gap-4 border-b border-border bg-background px-7">
      <div className="flex min-w-0 flex-col">
        <h1 className="truncate text-xl font-bold leading-tight text-foreground">{title}</h1>
        <span className="truncate text-xs text-muted-foreground">{sub}</span>
      </div>

      <div className="flex-1" />

      <Input
        icon={<Search className="h-4 w-4" />}
        placeholder="Tìm nhiệm vụ, dự án…"
        className="hidden h-10 w-[280px] rounded-xl md:flex"
        aria-label="Tìm kiếm"
      />

      <button
        type="button"
        aria-label="Thông báo"
        className="relative grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground hover:bg-accent"
      >
        <Bell className="h-[18px] w-[18px]" />
      </button>

      <Button leftIcon={<Plus className="h-4 w-4" />} onClick={onCreateProject}>
        Tạo mới
      </Button>
    </header>
  );
}
