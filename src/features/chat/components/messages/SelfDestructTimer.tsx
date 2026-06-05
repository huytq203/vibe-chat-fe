'use client';

import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { serverNow } from '@/lib/time/server-clock';
import { formatTimeLeft } from '@/features/chat/utils';

type SelfDestructTimerProps = {
  /** ISO thời điểm tin biến mất. */
  expireAt: string;
  isMe: boolean;
};

/**
 * Đồng hồ đếm ngược cho tin tự huỷ (xem 15-edit-recall-selfdestruct.md).
 * Việc ẩn tin do useSelfDestruct lo — component này chỉ hiển thị thời gian còn lại.
 */
export function SelfDestructTimer({ expireAt, isMe }: SelfDestructTimerProps) {
  const target = new Date(expireAt).getTime();
  const [left, setLeft] = useState(() => target - serverNow());

  useEffect(() => {
    const id = setInterval(() => setLeft(target - serverNow()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (left <= 0) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[9.5px]',
        isMe ? 'text-primary-foreground/60' : 'text-muted-foreground/70',
      )}
      title="Tin nhắn tự huỷ"
    >
      <Timer className="h-3 w-3" />
      {formatTimeLeft(left)}
    </span>
  );
}
