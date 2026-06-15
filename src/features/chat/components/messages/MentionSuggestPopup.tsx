'use client';

import { AtSign } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Avatar } from '@/features/chat/components/common/Avatar';
import { mentionLabel } from './composer-utils';
import type { MentionItem, MentionListView } from '@/features/chat/hooks/mention-bridge';

type MentionSuggestPopupProps = {
  mention: MentionListView;
};

function itemKey(item: MentionItem): string {
  return item.kind === 'all' ? '__all__' : item.member.userId;
}

/** Danh sách gợi ý @member nổi phía trên ô soạn khi đang gõ `@`. */
export function MentionSuggestPopup({ mention }: MentionSuggestPopupProps) {
  if (!mention.isOpen) return null;

  return (
    <div
      role="listbox"
      aria-label="Gợi ý nhắc tên"
      className="mb-2 max-h-56 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg"
    >
      {mention.items.map((item, index) => (
        <button
          key={itemKey(item)}
          type="button"
          role="option"
          aria-selected={index === mention.activeIndex}
          onMouseEnter={() => mention.setActiveIndex(index)}
          onMouseDown={(e) => {
            // Giữ caret trong editor (đừng để blur) trước khi chèn chip.
            e.preventDefault();
            mention.select(item);
          }}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors',
            index === mention.activeIndex ? 'bg-primary/10' : 'hover:bg-muted',
          )}
        >
          {item.kind === 'all' ? (
            <>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <AtSign className="h-4 w-4" />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[13px] font-medium text-foreground">Tất cả mọi người</span>
                <span className="truncate text-[11px] text-muted-foreground">@all · nhắc toàn nhóm</span>
              </div>
            </>
          ) : (
            <>
              <Avatar
                name={item.member.displayName}
                src={item.member.avatarUrl}
                seed={item.member.userId}
                size="sm"
                className="!h-7 !w-7 !rounded-lg !text-[9px]"
              />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[13px] font-medium text-foreground">
                  {mentionLabel(item.member)}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">@{item.member.username}</span>
              </div>
            </>
          )}
        </button>
      ))}
    </div>
  );
}
