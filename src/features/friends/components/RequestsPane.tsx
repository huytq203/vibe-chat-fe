'use client';

import { Users } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner/Spinner';
import type { FriendRequest } from '../types';
import { IncomingRequestRow } from './IncomingRequestRow';
import { EmptyState } from './EmptyState';

type Props = {
  isLoading: boolean;
  items: FriendRequest[];
  pendingTargetId?: string;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
};

export function RequestsPane({
  isLoading,
  items,
  pendingTargetId,
  onAccept,
  onReject,
}: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }
  if (!items || items.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-10 w-10" />}
        title="Không có lời mời nào"
        hint="Khi có người gửi lời mời, bạn sẽ thấy ở đây"
      />
    );
  }
  return (
    <div className="px-2">
      <div className="px-1 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {items.length} lời mời đang chờ
      </div>
      <div className="flex flex-col gap-0.5">
        {items.map((r) => (
          <IncomingRequestRow
            key={r.user.id}
            request={r}
            isPending={pendingTargetId === r.user.id}
            onAccept={onAccept}
            onReject={onReject}
          />
        ))}
      </div>
    </div>
  );
}
