'use client';

import { Search } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner/Spinner';
import type { UserSearchItem } from '../types';
import { UserResultRow } from './UserResultRow';
import { EmptyState } from './EmptyState';

type Props = {
  query: string;
  items: UserSearchItem[];
  isLoading: boolean;
  isError: boolean;
  pendingTargetId?: string;
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
  onSend,
  onCancel,
  onAccept,
  onReject,
  onMessage,
}: Props) {
  if (query.length < 2) {
    return (
      <EmptyState
        icon={<Search className="h-10 w-10" />}
        title="Bắt đầu tìm kiếm"
        hint="Nhập username, email hoặc tên hiển thị (≥ 2 ký tự)"
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
