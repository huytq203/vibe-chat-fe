'use client';

import type { ReactNode } from 'react';
import { Check, MessageCircle, Phone, UserPlus, Video, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';
import type { FriendshipStatus } from '@/features/friends/types';

type ActionBtnProps = {
  icon: ReactNode;
  label: string;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

function ActionBtn({ icon, label, primary, danger, disabled, onClick }: ActionBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-1 items-center justify-center gap-[7px] rounded-xl py-[11px] text-[14px] font-bold transition-all active:scale-[0.98] disabled:opacity-60',
        primary && 'bg-primary text-white hover:brightness-110',
        danger && 'border border-border bg-secondary text-muted-foreground hover:border-destructive/50 hover:text-destructive',
        !primary && !danger && 'border border-border bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      {icon}{label}
    </button>
  );
}

type Props = {
  friendship: FriendshipStatus;
  pending: boolean;
  onAdd: () => void;
  onMessage: () => void;
};

export function InviteActionButtons({ friendship, pending, onAdd, onMessage }: Props) {
  if (friendship === 'ACCEPTED') {
    return (
      <div className="flex gap-2">
        <ActionBtn icon={<MessageCircle className="h-[18px] w-[18px]" />} label="Nhắn tin" primary onClick={onMessage} />
        <ActionBtn icon={<Phone className="h-[18px] w-[18px]" />} label="Gọi điện" onClick={() => toast.info('Tính năng đang phát triển')} />
        <ActionBtn icon={<Video className="h-[18px] w-[18px]" />} label="Video" onClick={() => toast.info('Tính năng đang phát triển')} />
      </div>
    );
  }

  if (friendship === 'PENDING_OUT') {
    return (
      <div className="flex gap-2">
        <div className="flex flex-1 items-center justify-center gap-[7px] rounded-xl border border-primary/40 bg-secondary py-[11px] text-[14px] font-bold text-secondary-foreground">
          <Check className="h-4 w-4" /> Đã gửi lời mời
        </div>
        <button
          type="button"
          className="flex shrink-0 items-center justify-center rounded-xl border border-border bg-secondary px-4 text-[14px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          Hủy
        </button>
      </div>
    );
  }

  if (friendship === 'PENDING_IN') {
    return (
      <div className="flex gap-2">
        <ActionBtn icon={<Check className="h-4 w-4" />} label="Chấp nhận" primary onClick={() => {}} />
        <ActionBtn icon={<X className="h-[14px] w-[14px]" />} label="Từ chối" danger onClick={() => {}} />
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <ActionBtn icon={<UserPlus className="h-4 w-4" />} label="Kết bạn" primary disabled={pending} onClick={onAdd} />
      <ActionBtn icon={<MessageCircle className="h-[18px] w-[18px]" />} label="Nhắn tin" onClick={onMessage} />
    </div>
  );
}
