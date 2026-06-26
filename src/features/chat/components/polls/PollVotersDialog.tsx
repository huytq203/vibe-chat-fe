'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog/Dialog';
import { Avatar } from '@/features/chat/components/common/Avatar';
import type { PollData, ConversationMember } from '@/features/chat/types';
import { BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poll: PollData;
  members: ConversationMember[];
};

export function PollVotersDialog({ open, onOpenChange, poll, members }: Props) {
  const memberMap = new Map(members.map((m) => [m.userId, m]));
  const totalVotes = poll.totalVotes;
  const uniqueVoters = new Set(poll.options.flatMap((o) => o.voterIds ?? [])).size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 p-0">
        {/* Header */}
        <div className="flex items-start gap-2.5 border-b border-border px-4 py-3.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15">
            <BarChart2 className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-[13.5px] font-semibold leading-snug">
              {poll.question}
            </DialogTitle>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {totalVotes} lượt bình chọn
              {!poll.isAnonymous && uniqueVoters > 0 && ` · ${uniqueVoters} người`}
              {poll.isAnonymous && ' · Ẩn danh'}
            </p>
          </div>
        </div>

        {/* Options list */}
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-border/60">
          {poll.options.map((option) => {
            const pct = totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0;
            const voters = !poll.isAnonymous && option.voterIds
              ? option.voterIds.map((id) => memberMap.get(id) ?? { userId: id, displayName: null, username: null, avatarUrl: null })
              : [];

            return (
              <div key={option.id} className="px-4 py-3 space-y-2.5">
                {/* Option header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {option.hasVoted && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                    <span className={cn(
                      'truncate text-[13px] font-medium',
                      option.hasVoted ? 'text-primary' : 'text-foreground',
                    )}>
                      {option.text}
                    </span>
                  </div>
                  <span className={cn(
                    'shrink-0 text-[12px] font-semibold',
                    option.hasVoted ? 'text-primary' : 'text-muted-foreground',
                  )}>
                    {pct}%
                    <span className="ml-1 font-normal text-muted-foreground">· {option.voteCount}</span>
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      option.hasVoted ? 'bg-primary' : 'bg-muted-foreground/40',
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Voters */}
                {!poll.isAnonymous && voters.length > 0 && (
                  <div className="space-y-2 pt-0.5">
                    {voters.map(({ userId, displayName, username, avatarUrl }) => (
                      <div key={userId} className="flex items-center gap-2">
                        <Avatar
                          name={(displayName || username) ?? null}
                          src={avatarUrl ?? null}
                          size="sm"
                          className="h-5! w-5! text-[8px]!"
                        />
                        <span className="text-[12.5px] text-foreground">
                          {displayName || username || 'Người dùng'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {poll.isAnonymous && option.voteCount > 0 && (
                  <p className="text-[11.5px] text-muted-foreground">
                    {option.voteCount} người đã bình chọn (ẩn danh)
                  </p>
                )}

                {option.voteCount === 0 && (
                  <p className="text-[11.5px] text-muted-foreground/70">Chưa có lượt bình chọn</p>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
