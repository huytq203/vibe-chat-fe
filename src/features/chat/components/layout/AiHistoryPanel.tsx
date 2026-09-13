'use client';

import { Trash2 } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner/Spinner';
import { cn } from '@/lib/utils/cn';
import { AiAvatar, AiMascot } from '@/components/common/BrandAssets';
import { Button } from '@/components/ui/button/Button';
import type { AiConversationSummary } from '@/services/ai-conversations.api';

interface AiHistoryPanelProps {
  conversations: AiConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  isDeleting?: (id: string) => boolean;
}

export function AiHistoryPanel({ conversations, activeId, onSelect, onDelete, isDeleting }: AiHistoryPanelProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
        <AiMascot className="h-20 w-24 drop-shadow-[0_10px_18px_rgb(61_31_91/0.14)]" />
        <p className="text-[13px] text-muted-foreground">Chưa có cuộc trò chuyện nào</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 pb-3">
      {conversations.map((conversation) => {
        const title = conversation.title ?? 'Cuộc trò chuyện mới';
        return (
          <div key={conversation.id} className="group relative">
            <button
              type="button"
              onClick={() => onSelect(conversation.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg py-2 pl-3 pr-10 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                conversation.id === activeId
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground hover:bg-muted',
              )}
            >
              <AiAvatar className="size-5 ring-1 ring-primary/15" />
              <span className="flex-1 truncate text-[13px]">{title}</span>
            </button>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`Xoá cuộc trò chuyện ${title}`}
              onClick={() => onDelete(conversation.id)}
              disabled={isDeleting?.(conversation.id) ?? false}
              className="invisible absolute right-1 top-1 size-8 text-muted-foreground opacity-0 hover:text-danger focus-visible:visible focus-visible:opacity-100 group-hover:visible group-hover:opacity-100"
            >
              {isDeleting?.(conversation.id) ? <Spinner size="xs" /> : <Trash2 className="size-3.5" />}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
