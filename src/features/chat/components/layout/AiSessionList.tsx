'use client';

import { Bot, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button/Button';
import type { AiSession } from '@/features/chat/hooks/useAiSessions';

type Props = {
  sessions: AiSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
};

export function AiSessionList({ sessions, activeId, onSelect, onCreate, onDelete }: Props) {
  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-border bg-sidebar">
      <header className="flex shrink-0 items-center justify-between px-4 pb-3 pt-[18px]">
        <span className="text-sm font-semibold text-foreground">Lịch sử</span>
        <Button
          variant="ghost"
          size="icon-sm"
          title="Tạo cuộc trò chuyện mới"
          aria-label="Tạo cuộc trò chuyện mới"
          onClick={onCreate}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <Bot className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-[13px] text-muted-foreground">Chưa có cuộc trò chuyện nào</p>
          </div>
        ) : (
          sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={session.id === activeId}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </aside>
  );
}

type SessionItemProps = {
  session: AiSession;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
};

function SessionItem({ session, isActive, onSelect, onDelete }: SessionItemProps) {
  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    onDelete(session.id);
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(session.id)}
      className={cn(
        'group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-foreground hover:bg-muted',
      )}
    >
      <Bot className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate text-[13px]">{session.title}</span>
      <span
        role="button"
        aria-label="Xoá cuộc trò chuyện"
        onClick={handleDelete}
        className="invisible flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover:visible group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}
