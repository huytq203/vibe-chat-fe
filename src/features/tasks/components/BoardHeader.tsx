'use client';

import { LayoutGrid, List, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { useMembers } from '../hooks/useMembers';
import { useTasksUIStore } from '../stores/tasks-ui.store';

export function BoardHeader({ projectId }: { projectId: string }) {
  const { data: members = [] } = useMembers(projectId);
  const boardView = useTasksUIStore((s) => s.boardView);
  const setBoardView = useTasksUIStore((s) => s.setBoardView);
  const openSettings = useTasksUIStore((s) => s.openSettings);

  const visible = members.slice(0, 5);
  const extra = members.length - visible.length;

  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
      <div className="flex items-center gap-1">
        {visible.map((m) => (
          <Avatar
            key={m.userId}
            src={m.avatarUrl ?? undefined}
            fallback={m.displayName.charAt(0).toUpperCase()}
            className="h-7 w-7 border-2 border-background"
          />
        ))}
        {extra > 0 && (
          <span className="ml-1 text-xs text-muted-foreground">+{extra}</span>
        )}
        <Button
          variant="ghost"
          size="xs"
          className="ml-2"
          onClick={() => openSettings('share')}
        >
          Chia sẻ
        </Button>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant={boardView === 'board' ? 'secondary' : 'ghost'}
          size="icon-sm"
          className="h-7 w-7"
          onClick={() => setBoardView('board')}
          aria-label="Kanban view"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          variant={boardView === 'list' ? 'secondary' : 'ghost'}
          size="icon-sm"
          className="h-7 w-7"
          onClick={() => setBoardView('list')}
          aria-label="List view"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-7 w-7"
          onClick={() => openSettings('info')}
          aria-label="Cài đặt project"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
