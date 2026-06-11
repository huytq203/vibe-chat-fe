'use client';

import { Phone, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Avatar } from '@/features/chat/components/common/Avatar';
import type { CallPeer, CallType } from '@/features/call/types';

type IncomingCallDialogProps = {
  peer: CallPeer;
  type: CallType;
  isGroup: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

export function IncomingCallDialog({
  peer,
  type,
  isGroup,
  onAccept,
  onDecline,
}: IncomingCallDialogProps) {
  const kind = type === 'VIDEO' ? 'Cuộc gọi video' : 'Cuộc gọi thoại';
  const subtitle = isGroup ? `${kind} nhóm đến…` : `${kind} đến…`;
  return (
    <div className="pointer-events-auto fixed bottom-6 right-6 z-[60] w-[320px] rounded-2xl border border-border bg-card p-5 shadow-2xl bg-accent">
      <div className="flex flex-col items-center gap-3">
        <Avatar name={peer.name} src={peer.avatarUrl} size="lg" />
        <div className="text-center">
          <p className="text-base font-medium text-foreground">{peer.name}</p>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="mt-2 flex items-center gap-6">
          <Button
            variant="solid"
            size="icon"
            aria-label="Từ chối"
            onClick={onDecline}
            className="h-12 w-12 rounded-full bg-destructive text-white hover:bg-destructive/90"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
          <Button
            variant="solid"
            size="icon"
            aria-label="Bắt máy"
            onClick={onAccept}
            className="h-12 w-12 rounded-full bg-success text-white hover:bg-success/90"
          >
            <Phone className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
