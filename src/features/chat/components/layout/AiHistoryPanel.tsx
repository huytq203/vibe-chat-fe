'use client';

import { Bot, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { AiSession } from '@/features/chat/hooks/useAiSessions';

interface AiHistoryPanelProps {
  sessions: AiSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function AiHistoryPanel({ sessions, activeId, onSelect, onDelete }: AiHistoryPanelProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
        <Bot className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-[13px] text-muted-foreground">Chưa có cuộc trò chuyện nào</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 pb-3">
      {sessions.map((session) => (
        <button
          key={session.id}
          type="button"
          onClick={() => onSelect(session.id)}
          className={cn(
            'group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors',
            session.id === activeId
              ? 'bg-primary/10 text-primary'
              : 'text-foreground hover:bg-muted',
          )}
        >
          <Bot className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-[13px]">{session.title}</span>
          <span
            role="button"
            aria-label="Xoá cuộc trò chuyện"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(session.id);
            }}
            className="invisible flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover:visible group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </span>
        </button>
      ))}
    </div>
  );
}
