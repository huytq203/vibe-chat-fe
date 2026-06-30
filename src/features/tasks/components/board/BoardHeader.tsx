'use client';

import { Settings } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { useMembers } from '../../hooks/useMembers';
import { useTasksUIStore } from '../../stores/tasks-ui.store';

export function BoardHeader({ projectId }: { projectId: string }) {
  const { data: members = [] } = useMembers(projectId);
  const boardView = useTasksUIStore((s) => s.boardView);
  const setBoardView = useTasksUIStore((s) => s.setBoardView);
  const openSettings = useTasksUIStore((s) => s.openSettings);

  const visible = members.slice(0, 5);

  return (
    <div className="flex h-[54px] shrink-0 items-center justify-between px-6 border-b border-border bg-background">
      {/* Left: view toggle segment control */}
      <div className="flex rounded-xl bg-muted p-1 gap-1">
        <button
          type="button"
          onClick={() => setBoardView('board')}
          className={
            boardView === 'board'
              ? 'bg-secondary text-primary rounded-lg px-3 py-1 text-sm font-semibold shadow-sm'
              : 'text-muted-foreground px-3 py-1 text-sm cursor-pointer'
          }
        >
          Board
        </button>
        <button
          type="button"
          onClick={() => setBoardView('list')}
          className={
            boardView === 'list'
              ? 'bg-secondary text-primary rounded-lg px-3 py-1 text-sm font-semibold shadow-sm'
              : 'text-muted-foreground px-3 py-1 text-sm cursor-pointer'
          }
        >
          Danh sách
        </button>
      </div>

      {/* Right: members + settings + share */}
      <div className="flex items-center gap-3">
        {/* Member avatars */}
        {visible.length > 0 && (
          <div className="flex -space-x-2">
            {visible.map((m) => (
              <Avatar
                key={m.userId}
                src={m.avatarUrl ?? undefined}
                fallback={m.displayName.charAt(0).toUpperCase()}
                size="sm"
                className="border-2 border-background"
              />
            ))}
          </div>
        )}

        {/* Settings gear */}
        <button
          type="button"
          onClick={() => openSettings('info')}
          aria-label="Cài đặt project"
          className="border border-border bg-secondary rounded-xl p-2 cursor-pointer hover:bg-accent"
        >
          <Settings className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Share button */}
        <button
          type="button"
          onClick={() => openSettings('share')}
          className="bg-primary text-primary-foreground rounded-xl px-4 py-1.5 text-sm font-semibold ml-3 hover:bg-primary/90"
        >
          Chia sẻ
        </button>
      </div>
    </div>
  );
}
