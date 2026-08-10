'use client';

import { Columns3, List, Settings, Share2 } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { useMembers } from '../../hooks/useMembers';
import { useTasksUIStore } from '../../stores/tasks-ui.store';

export function BoardHeader({ projectId }: { projectId: string }) {
  const { data: members = [] } = useMembers(projectId);
  const boardView = useTasksUIStore((s) => s.boardView);
  const setBoardView = useTasksUIStore((s) => s.setBoardView);
  const openSettings = useTasksUIStore((s) => s.openSettings);

  const visible = members.slice(0, 3);
  const hiddenCount = Math.max(0, members.length - visible.length);

  return (
    <div className="flex min-h-12 shrink-0 flex-wrap items-center gap-2 px-4 pb-3 sm:px-5">
      {/* Left: view toggle segment control */}
      <div className="flex gap-1 rounded-xl bg-muted p-1" role="group" aria-label="Kiểu hiển thị">
        <button
          type="button"
          onClick={() => setBoardView('board')}
          aria-pressed={boardView === 'board'}
          className={boardView === 'board'
            ? 'flex h-9 items-center gap-1.5 rounded-lg bg-background px-3 text-sm font-semibold text-primary shadow-micro'
            : 'flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground'}
        >
          <Columns3 className="h-4 w-4" />
          Board
        </button>
        <button
          type="button"
          onClick={() => setBoardView('list')}
          aria-pressed={boardView === 'list'}
          className={boardView === 'list'
            ? 'flex h-9 items-center gap-1.5 rounded-lg bg-background px-3 text-sm font-semibold text-primary shadow-micro'
            : 'flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground'}
        >
          <List className="h-4 w-4" />
          Danh sách
        </button>
      </div>

      {/* Right: members + settings + share */}
      <div className="ml-auto flex items-center gap-2">
        {/* Member avatars */}
        {visible.length > 0 && (
          <div className="hidden items-center -space-x-2 sm:flex" aria-label={`${members.length} thành viên`}>
            {visible.map((m) => (
              <Avatar
                key={m.userId}
                src={m.avatarUrl ?? undefined}
                fallback={m.displayName.charAt(0).toUpperCase()}
                size="sm"
                className="border-2 border-background"
              />
            ))}
            {hiddenCount > 0 && (
              <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-background bg-muted text-[10px] font-semibold text-muted-foreground">
                +{hiddenCount}
              </span>
            )}
          </div>
        )}

        {/* Settings gear */}
        <button
          type="button"
          onClick={() => openSettings('info')}
          aria-label="Cài đặt project"
          className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Settings className="h-4 w-4" />
        </button>

        {/* Share button */}
        <button
          type="button"
          onClick={() => openSettings('share')}
          aria-label="Chia sẻ dự án"
          className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:px-3"
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Chia sẻ</span>
        </button>
      </div>
    </div>
  );
}
