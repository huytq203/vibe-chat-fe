'use client';

import { BarChart3, Columns3, Home, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { ActiveView } from '../../stores/tasks-ui.store';

interface AppSidebarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
}

const NAV_ITEMS: { view: ActiveView; label: string; Icon: typeof Home }[] = [
  { view: 'home', label: 'Trang chủ', Icon: Home },
  { view: 'projects', label: 'Dự án', Icon: LayoutGrid },
  { view: 'board', label: 'Nhiệm vụ', Icon: Columns3 },
  { view: 'reports', label: 'Báo cáo', Icon: BarChart3 },
];

export function AppSidebar({ activeView, onNavigate }: AppSidebarProps) {
  return (
    <nav
      aria-label="Điều hướng công việc"
      className="flex shrink-0 items-center gap-1 rounded-xl bg-muted p-1"
    >
      {NAV_ITEMS.map(({ view, label, Icon }) => {
        const active = activeView === view;
        return (
          <button
            key={view}
            type="button"
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            title={label}
            onClick={() => onNavigate(view)}
            className={cn(
              'flex h-9 min-w-9 items-center justify-center gap-2 rounded-lg px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'bg-background text-primary shadow-micro'
                : 'text-muted-foreground hover:bg-background/70 hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="hidden xl:inline">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
