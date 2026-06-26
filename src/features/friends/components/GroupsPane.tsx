'use client';

import { Lock, Users } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner/Spinner';
import { Avatar } from '@/features/chat/components/common/Avatar';
import {
  getConversationAvatar,
  getConversationName,
} from '@/features/chat/utils';
import type { Conversation } from '@/features/chat/types';
import { EmptyState } from './EmptyState';

type Props = {
  items: Conversation[];
  meId: string | null;
  isLoading: boolean;
  isError: boolean;
  isFetchingMore: boolean;
  onOpen: (id: string) => void;
};

export function GroupsPane({ items, meId, isLoading, isError, isFetchingMore, onOpen }: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }
  if (isError) {
    return (
      <EmptyState
        icon={<Users className="h-9 w-9" />}
        title="Không tải được danh sách nhóm"
        hint="Vui lòng thử lại sau"
      />
    );
  }
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-9 w-9" />}
        title="Chưa có nhóm nào"
        hint="Tạo nhóm hoặc tham gia nhóm để thấy ở đây"
      />
    );
  }

  return (
    <div className="px-2">
      <div className="px-1 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {items.length} nhóm
      </div>
      <div className="flex flex-col gap-0.5">
        {items.map((c) => (
          <GroupRow key={c.id} conversation={c} meId={meId} onOpen={onOpen} />
        ))}
      </div>
      {isFetchingMore && (
        <div className="flex items-center justify-center py-3">
          <Spinner size="sm" />
        </div>
      )}
    </div>
  );
}

function GroupRow({
  conversation,
  meId,
  onOpen,
}: {
  conversation: Conversation;
  meId: string | null;
  onOpen: (id: string) => void;
}) {
  const name = getConversationName(conversation, meId);
  const avatarUrl = getConversationAvatar(conversation, meId);

  return (
    <button
      type="button"
      onClick={() => onOpen(conversation.id)}
      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-accent/50"
    >
      <Avatar name={name} src={avatarUrl} type="group" size="md" status={null} />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1">
          {conversation.isLocked && (
            <Lock className="h-3 w-3 shrink-0 text-primary" aria-label="Đang khoá" />
          )}
          <span className="truncate text-sm font-semibold text-foreground">{name}</span>
        </span>
        <span className="block truncate text-[11px] text-muted-foreground">
          {conversation.memberCount} thành viên
        </span>
      </span>
    </button>
  );
}
