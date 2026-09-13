'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { isToday } from 'date-fns';
import { Check, ChevronDown, MessageSquarePlus, Trash2 } from 'lucide-react';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button/Button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover/Popover';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { cn } from '@/lib/utils/cn';
import type { AiConversationSummary } from '@/services/ai-conversations.api';

const NEW_CONVERSATION_TITLE = 'Cuộc trò chuyện mới';

interface ConversationGroups {
  today: AiConversationSummary[];
  older: AiConversationSummary[];
}

function groupConversations(conversations: AiConversationSummary[]): ConversationGroups {
  const sorted = [...conversations].sort(
    (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
  );
  return {
    today: sorted.filter(({ updatedAt }) => isToday(new Date(updatedAt))),
    older: sorted.filter(({ updatedAt }) => !isToday(new Date(updatedAt))),
  };
}

function ConversationGroup({ label, items, activeId, onSelect, onDelete, isDeleting }: {
  label: string;
  items: AiConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  isDeleting: (id: string) => boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={`conversation-group-${label}`}>
      <h2
        id={`conversation-group-${label}`}
        className="px-2 pb-1 pt-2 text-xs font-semibold text-muted-foreground"
      >
        {label}
      </h2>
      <div className="space-y-0.5">
        {items.map((conversation) => {
          const title = conversation.title?.trim() || NEW_CONVERSATION_TITLE;
          return (
            <div key={conversation.id} className="group flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 min-w-0 flex-1 justify-start px-2 text-start font-normal',
                  conversation.id === activeId && 'bg-accent text-foreground',
                )}
                onClick={() => onSelect(conversation.id)}
              >
                <span className="min-w-0 flex-1 truncate">{title}</span>
                {conversation.id === activeId && (
                  <Check className="size-3.5 shrink-0" aria-hidden="true" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                aria-label={`Xoá ${title}`}
                title={`Xoá ${title}`}
                disabled={isDeleting(conversation.id)}
                onClick={() => onDelete(conversation.id)}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ConversationListState({
  conversations,
  activeId,
  isLoading,
  isError,
  onSelect,
  onDelete,
  isDeleting,
  onRetry,
}: Omit<AiConversationBarProps, 'activeTitle' | 'onStartNew'>): ReactNode {
  const groups = useMemo(() => groupConversations(conversations), [conversations]);
  if (isLoading) return <ConversationListSkeleton />;
  if (isError) return <ErrorState message="Không tải được lịch sử hội thoại" onRetry={onRetry} size="sm" />;
  if (conversations.length === 0) {
    return <p className="px-3 py-6 text-center text-xs text-muted-foreground">Chưa có cuộc trò chuyện nào</p>;
  }
  return (
    <div className="max-h-72 overflow-y-auto pb-1">
      <ConversationGroup
        label="Hôm nay"
        items={groups.today}
        activeId={activeId}
        onSelect={onSelect}
        onDelete={onDelete}
        isDeleting={isDeleting}
      />
      <ConversationGroup
        label="Cũ hơn"
        items={groups.older}
        activeId={activeId}
        onSelect={onSelect}
        onDelete={onDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}

function ConversationListSkeleton() {
  return (
    <div className="space-y-3 p-3" role="status" aria-label="Đang tải lịch sử hội thoại">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-4/5" />
    </div>
  );
}

interface AiConversationBarProps {
  conversations: AiConversationSummary[];
  activeId: string | null;
  activeTitle: string | null;
  isLoading: boolean;
  isError: boolean;
  onSelect: (id: string) => void;
  onStartNew: () => void;
  onDelete: (id: string) => void;
  isDeleting: (id: string) => boolean;
  onRetry: () => void;
}

interface ConversationPopoverProps extends Omit<AiConversationBarProps, 'activeTitle' | 'onStartNew'> {
  title: string;
}

function ConversationPopover({
  conversations,
  activeId,
  title,
  isLoading,
  isError,
  onSelect,
  onDelete,
  isDeleting,
  onRetry,
}: ConversationPopoverProps) {
  const [open, setOpen] = useState(false);
  const selectAndClose = (id: string) => {
    onSelect(id);
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-w-0 flex-1 justify-start px-2"
          aria-label={`${title}, mở lịch sử hội thoại`}
        >
          <span className="min-w-0 flex-1 truncate text-start">{title}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={4}
        showArrow={false}
        className="w-[316px] max-w-[calc(100vw-1.5rem)] p-2"
      >
        <ConversationListState
          conversations={conversations}
          activeId={activeId}
          isLoading={isLoading}
          isError={isError}
          onSelect={selectAndClose}
          onDelete={onDelete}
          isDeleting={isDeleting}
          onRetry={onRetry}
        />
      </PopoverContent>
    </Popover>
  );
}

export function AiConversationBar(props: AiConversationBarProps) {
  const title = props.activeTitle?.trim() || NEW_CONVERSATION_TITLE;
  return (
    <div className="flex h-11 shrink-0 items-center gap-1 border-b border-border px-3">
      <ConversationPopover {...props} title={title} />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0"
        aria-label="Tạo hội thoại mới"
        title="Tạo hội thoại mới"
        onClick={props.onStartNew}
      >
        <MessageSquarePlus className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
