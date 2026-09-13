'use client';

import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { AiConversationSummary } from '@/services/ai-conversations.api';
import { formatSessionTime } from '@/features/chat/hooks/useAiSessionGroups';

interface AiSessionItemProps {
  conversation: AiConversationSummary;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function AiSessionItem({ conversation, isActive, onSelect, onDelete }: AiSessionItemProps) {
  const title = conversation.title ?? 'Cuộc trò chuyện mới';
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => onSelect(conversation.id)}
        aria-label={title}
        aria-current={isActive ? 'true' : undefined}
        className={cn(
          'flex w-full flex-col gap-0.5 rounded-xl py-2 pl-3 pr-9 text-left transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isActive
            ? 'bg-primary/12 ring-1 ring-inset ring-primary/25'
            : 'hover:bg-muted/70',
        )}
      >
        <span className="flex w-full items-baseline gap-2">
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-[13px]',
              isActive ? 'font-semibold text-primary' : 'font-medium text-foreground',
            )}
          >
            {title}
          </span>
          <span className="shrink-0 text-[10.5px] tabular-nums text-muted-foreground">
            {formatSessionTime(conversation.updatedAt)}
          </span>
        </span>
      </button>

      <button
        type="button"
        aria-label={`Xoá cuộc trò chuyện ${title}`}
        title="Xoá cuộc trò chuyện"
        onClick={() => onDelete(conversation.id)}
        className={cn(
          'absolute right-1.5 top-2 flex h-6 w-6 items-center justify-center rounded-lg',
          'text-muted-foreground opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger',
          'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'group-hover:opacity-100',
        )}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
