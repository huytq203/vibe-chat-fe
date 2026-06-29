'use client';

import { Home, LayoutGrid, Columns3, BarChart3, Settings } from 'lucide-react';
import { Dock, DockIcon } from '@/components/ui/dock/Dock';
import { cn } from '@/lib/utils/cn';
import { getCurrentUser } from '../lib/current-user';
import type { ActiveView } from '../stores/tasks-ui.store';

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

function SidebarSeparator({ className }: { className?: string }) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={cn('h-px w-8 shrink-0 self-center bg-border/70', className)}
    />
  );
}

export function AppSidebar({ activeView, onNavigate }: AppSidebarProps) {
  const user = getCurrentUser();
  const initial = (user?.displayName ?? 'U').charAt(0).toUpperCase();

  return (
    <aside className="flex h-full w-[86px] shrink-0 flex-col items-center border-r border-border bg-sidebar py-4">
      <span className="grid h-[46px] w-[46px] place-items-center rounded-xl bg-gradient-to-br from-primary to-cyan-600 text-lg font-extrabold text-white shadow-lg">
        TF
      </span>

      <SidebarSeparator className="my-4" />

      <Dock
        orientation="vertical"
        iconSize={44}
        iconMagnification={58}
        className="flex-1 border-0 bg-transparent p-0"
      >
        {NAV_ITEMS.map(({ view, label, Icon }) => (
          <DockIcon
            key={view}
            label={label}
            aria-label={label}
            onClick={() => onNavigate(view)}
            className={cn(
              'bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
              activeView === view && 'bg-primary/15 text-primary',
            )}
          >
            <Icon className="h-5 w-5" />
          </DockIcon>
        ))}
      </Dock>

      <SidebarSeparator className="my-3" />

      <Dock
        orientation="vertical"
        iconSize={40}
        iconMagnification={52}
        className="border-0 bg-transparent p-0"
      >
        <DockIcon
          label="Cài đặt"
          aria-label="Cài đặt"
          className="bg-transparent text-muted-foreground hover:bg-accent"
        >
          <Settings className="h-5 w-5" />
        </DockIcon>
        <DockIcon
          label={user?.displayName ?? 'Tài khoản'}
          aria-label={user?.displayName ?? 'Tài khoản'}
          className="bg-gradient-to-br from-primary to-cyan-600 text-sm font-bold text-white"
        >
          {initial}
        </DockIcon>
      </Dock>
    </aside>
  );
}
