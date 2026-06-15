'use client';

import { format } from 'date-fns';
import { CalendarClock, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge/Badge';
import { Button } from '@/components/ui/button/Button';
import { Spinner } from '@/components/ui/spinner/Spinner';
import {
  useCancelScheduledMessage,
  useScheduledMessages,
} from '@/features/chat/hooks/use-scheduled-messages';
import type {
  ScheduledMessage,
  ScheduledMessageStatus,
} from '@/features/chat/types';

const STATUS_META: Record<
  ScheduledMessageStatus,
  { label: string; variant: 'soft-warning' | 'soft-success' | 'secondary' | 'soft-danger' }
> = {
  PENDING: { label: 'Chờ gửi', variant: 'soft-warning' },
  SENT: { label: 'Đã gửi', variant: 'soft-success' },
  CANCELLED: { label: 'Đã huỷ', variant: 'secondary' },
  FAILED: { label: 'Thất bại', variant: 'soft-danger' },
};

function ScheduledItem({ item }: { item: ScheduledMessage }) {
  const cancel = useCancelScheduledMessage();
  const meta = STATUS_META[item.status];
  const preview = item.plaintext ?? item.contentPreview ?? '(Tin đính kèm)';

  return (
    <li className="flex items-start gap-3 rounded-lg border border-border p-3">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <Badge variant={meta.variant} size="sm">
            {meta.label}
          </Badge>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            {format(new Date(item.scheduledAt), "HH:mm 'ngày' dd/MM/yyyy")}
          </span>
        </div>
        <p className="line-clamp-2 break-words text-sm text-foreground">{preview}</p>
        {item.status === 'FAILED' && item.failureReason && (
          <p className="mt-1 text-xs text-danger">{item.failureReason}</p>
        )}
      </div>
      {item.status === 'PENDING' && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Huỷ tin hẹn giờ"
          title="Huỷ"
          isLoading={cancel.isPending}
          onClick={() =>
            cancel.mutate({
              conversationId: item.conversationId,
              scheduledId: item.id,
            })
          }
          className="shrink-0 text-muted-foreground hover:text-danger"
        >
          {!cancel.isPending && <Trash2 className="h-4 w-4" />}
        </Button>
      )}
    </li>
  );
}

/** Danh sách tin hẹn giờ của chính mình trong conversation. Đủ 4 trạng thái. */
export function ScheduledMessageList({
  conversationId,
}: {
  conversationId: string;
}) {
  const { data, isLoading, isError, refetch } = useScheduledMessages(conversationId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
        <p>Không tải được danh sách tin hẹn giờ</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          Thử lại
        </Button>
      </div>
    );
  }
  if (!data || data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Chưa có tin nhắn nào được hẹn giờ
      </p>
    );
  }

  return (
    <ul className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-1">
      {data.map((item) => (
        <ScheduledItem key={item.id} item={item} />
      ))}
    </ul>
  );
}
