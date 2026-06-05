'use client';

import { Search, Users } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner/Spinner';
import type { UserSearchItem } from '@/features/friends/types';
import { UserResultRow } from './UserResultRow';
import { EmptyState } from './EmptyState';

type FriendsBlock = {
  sample: UserSearchItem[];
  total: number;
  isLoading: boolean;
};

type Props = {
  query: string;
  items: UserSearchItem[];
  isLoading: boolean;
  isError: boolean;
  pendingTargetId?: string;
  friends?: FriendsBlock;
  onSend: (u: UserSearchItem) => void;
  onCancel: (u: UserSearchItem) => void;
  onAccept: (u: UserSearchItem) => void;
  onReject: (u: UserSearchItem) => void;
  onMessage?: (u: UserSearchItem) => void;
};

export function SearchPane({
  query,
  items,
  isLoading,
  isError,
  pendingTargetId,
  friends,
  onSend,
  onCancel,
  onAccept,
  onReject,
  onMessage,
}: Props) {
  if (query.length < 2) {
    return (
      <FriendsSection
        friends={friends}
        onSend={onSend}
        onCancel={onCancel}
        onAccept={onAccept}
        onReject={onReject}
        onMessage={onMessage}
      />
    );
  }
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
        icon={<Search className="h-10 w-10" />}
        title="Có lỗi khi tìm kiếm"
        hint="Vui lòng thử lại sau"
      />
    );
  }
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Search className="h-10 w-10" />}
        title="Không tìm thấy người dùng"
        hint={`Không có kết quả cho "${query}"`}
      />
    );
  }

  return (
    <div className="px-2">
      <div className="px-1 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {items.length} kết quả cho {query}
      </div>
      <div className="flex flex-col gap-0.5">
        {items.map((u) => (
          <UserResultRow
            key={u.id}
            user={u}
            isPending={pendingTargetId === u.id}
            onSend={onSend}
            onCancel={onCancel}
            onAccept={onAccept}
            onReject={onReject}
            onMessage={onMessage}
          />
        ))}
      </div>
    </div>
  );
}

type FriendsSectionProps = {
  friends?: FriendsBlock;
  onSend: (u: UserSearchItem) => void;
  onCancel: (u: UserSearchItem) => void;
  onAccept: (u: UserSearchItem) => void;
  onReject: (u: UserSearchItem) => void;
  onMessage?: (u: UserSearchItem) => void;
};

function FriendsSection({
  friends,
  onSend,
  onCancel,
  onAccept,
  onReject,
  onMessage,
}: FriendsSectionProps) {
  if (!friends) {
    return (
      <EmptyState
        icon={<Search className="h-10 w-10" />}
        title="Bắt đầu tìm kiếm"
        hint="Nhập username, email hoặc tên hiển thị (≥ 2 ký tự)"
      />
    );
  }
  if (friends.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }
  if (friends.total === 0) {
    return (
      <EmptyState
        icon={<Users className="h-10 w-10" />}
        title="Chưa có bạn bè"
        hint="Tìm kiếm và gửi lời mời để bắt đầu kết bạn"
      />
    );
  }
  return (
    <div className="px-2">
      <div className="flex items-center justify-between px-1 pb-2 pt-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Bạn bè đã kết bạn
        </div>
        <div className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
          {friends.total}
        </div>
      </div>
      <div className="px-1 pb-2 text-[11px] text-muted-foreground">
        Gợi ý {friends.sample.length} người ngẫu nhiên • Nhập từ khoá để tìm người khác
      </div>
      <div className="flex flex-col gap-0.5">
        {friends.sample.map((u) => (
          <UserResultRow
            key={u.id}
            user={u}
            onSend={onSend}
            onCancel={onCancel}
            onAccept={onAccept}
            onReject={onReject}
            onMessage={onMessage}
          />
        ))}
      </div>
    </div>
  );
}
