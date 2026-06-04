'use client';

import { ArrowLeft, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Spinner } from '@/components/ui/spinner/Spinner';
import type { Conversation, JoinRequest } from '../../types';
import { useJoinRequests } from '../../hooks/use-query';
import { useAcceptJoinRequest, useRejectJoinRequest } from '../../hooks/use-mutations';
import { formatListTime } from '../../utils';
import { Avatar } from '../common/Avatar';

type JoinRequestsPanelProps = {
  conversation: Conversation;
  onBack: () => void;
  onClose: () => void;
};

export function JoinRequestsPanel({ conversation, onBack, onClose }: JoinRequestsPanelProps) {
  const { data: requests = [], isLoading } = useJoinRequests(conversation.id);
  const acceptMut = useAcceptJoinRequest();
  const rejectMut = useRejectJoinRequest();

  const isBusy = (req: JoinRequest) =>
    (acceptMut.isPending && acceptMut.variables?.requestId === req.id) ||
    (rejectMut.isPending && rejectMut.variables?.requestId === req.id);

  return (
    <aside className="flex h-full w-[300px] min-w-[260px] shrink-0 flex-col border-l border-border bg-sidebar text-sidebar-foreground">
      <header className="flex shrink-0 items-center gap-1 border-b border-border px-2 pb-3 pt-[18px]">
        <Button variant="ghost" size="icon-sm" onClick={onBack} title="Quay lại" aria-label="Quay lại">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="flex-1 text-sm font-bold">Yêu cầu vào nhóm ({requests.length})</span>
        <Button variant="ghost" size="icon-sm" onClick={onClose} title="Đóng" aria-label="Đóng">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {isLoading && (
          <div className="flex justify-center py-10">
            <Spinner className="h-5 w-5" />
          </div>
        )}

        {!isLoading &&
          requests.map((req) => {
            const r = req.requester;
            const name = r?.displayName || r?.username || 'Người dùng';
            const busy = isBusy(req);
            return (
              <div key={req.id} className="rounded-lg px-2 py-2.5 hover:bg-muted">
                <div className="flex items-center gap-2.5">
                  <Avatar name={name} src={r?.avatarUrl ?? null} seed={r?.userId ?? req.id} size="md" status={null} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-semibold text-foreground">{name}</div>
                    <div className="text-[11px] text-muted-foreground">{formatListTime(req.createdAt)}</div>
                  </div>
                </div>
                {req.reason && (
                  <p className="mt-1.5 rounded-md bg-muted/60 px-2.5 py-1.5 text-[12.5px] text-muted-foreground">
                    {req.reason}
                  </p>
                )}
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="solid"
                    className="flex-1"
                    isLoading={busy && acceptMut.isPending}
                    disabled={busy}
                    onClick={() =>
                      acceptMut.mutate({ conversationId: conversation.id, requestId: req.id })
                    }
                  >
                    <Check className="mr-1 h-3.5 w-3.5" />
                    Duyệt
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-danger hover:bg-danger/10"
                    isLoading={busy && rejectMut.isPending}
                    disabled={busy}
                    onClick={() =>
                      rejectMut.mutate({ conversationId: conversation.id, requestId: req.id })
                    }
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    Từ chối
                  </Button>
                </div>
              </div>
            );
          })}

        {!isLoading && requests.length === 0 && (
          <p className="px-3 py-10 text-center text-xs text-muted-foreground">
            Không có yêu cầu nào đang chờ duyệt
          </p>
        )}
      </div>
    </aside>
  );
}
