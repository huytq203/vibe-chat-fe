'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart2,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  Plus,
  Users,
} from 'lucide-react';
import { chatApi } from '@/services/chat.api';
import { pollKeys } from '@/services/keys';
import type { Message, PollData, PollOption } from '@/features/chat/types';
import { cn } from '@/lib/utils/cn';
import { useConversation } from '@/features/chat/hooks/use-query';
import { PollVotersDialog } from '@/features/chat/components/polls/PollVotersDialog';

/** Trả "Hôm nay" nếu cùng ngày, ngược lại "dd/MM/yyyy". */
function formatPollDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  ) {
    return 'Hôm nay';
  }
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function PollOptionRow({
  option,
  totalVotes,
  isMultiChoice,
  isExpired,
  isAnonymous,
  hideResults,
  onVote,
  onRemoveVote,
  isVoting,
}: {
  option: PollOption;
  totalVotes: number;
  isMultiChoice: boolean;
  isExpired: boolean;
  isAnonymous: boolean;
  hideResults: boolean;
  onVote: (optionId: string) => void;
  onRemoveVote: (optionId: string) => void;
  isVoting: boolean;
}) {
  const pct = !hideResults && totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0;
  const canToggle = !isExpired && !isVoting;

  return (
    <button
      type="button"
      disabled={!canToggle}
      onClick={() => {
        if (!canToggle) return;
        if (option.hasVoted) onRemoveVote(option.id);
        else onVote(option.id);
      }}
      className={cn(
        'relative w-full overflow-hidden rounded-lg border px-3 py-2.5 text-left transition-all',
        option.hasVoted
          ? 'border-primary bg-primary/15 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.2)]'
          : 'border-border/70 bg-background hover:border-border hover:bg-muted/50',
        (!canToggle || isExpired) && 'cursor-default',
      )}
    >
      {/* Thanh % background */}
      <div
        className="absolute inset-y-0 left-0 rounded-l-lg bg-primary/20 transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
      <div className="relative flex items-center gap-2">
        {/* Checkbox / radio icon */}
        <span className="shrink-0">
          {isMultiChoice ? (
            option.hasVoted ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <div className="h-4 w-4 rounded border-2 border-muted-foreground/60" />
            )
          ) : option.hasVoted ? (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground/60" />
          )}
        </span>

        {/* Option text */}
        <span className={cn('flex-1 text-[13px] font-medium leading-tight text-primary', option.hasVoted && 'text-primary')}>
          {option.text}
        </span>

        {/* Right side: voter avatars + % */}
        <div className="flex shrink-0 items-center gap-1.5">
         
          {!hideResults && (
            <span className={cn('text-[12px] font-semibold', option.hasVoted ? 'text-primary' : 'text-muted-foreground')}>
              {!isAnonymous && option.voteCount > 0 && (
                <span className="font-normal text-muted-foreground"> · {option.voteCount}</span>
              )}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function PollBubble({ message }: { message: Message }) {
  const pollId = message.metadata?.pollId as string | undefined;
  const qc = useQueryClient();
  const [newOptionText, setNewOptionText] = useState('');
  const [showVoters, setShowVoters] = useState(false);

  // Lấy conversation để tra tên creator
  const { data: conversation } = useConversation(message.conversationId);

  const { data: poll, isLoading } = useQuery({
    queryKey: pollId ? pollKeys.detail(pollId) : ['polls', 'detail', 'null'],
    queryFn: () => chatApi.getPoll(pollId as string),
    enabled: Boolean(pollId),
    staleTime: 30_000,
  });

  const invalidate = () => {
    if (pollId) qc.invalidateQueries({ queryKey: pollKeys.detail(pollId) });
  };

  const voteMutation = useMutation({
    mutationFn: (optionId: string) =>
      chatApi.votePoll(pollId as string, [optionId]),
    onSuccess: (data) => {
      qc.setQueryData<PollData>(pollKeys.detail(pollId as string), data);
    },
    onError: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (optionId: string) =>
      chatApi.removeVote(pollId as string, optionId),
    onSuccess: (data) => {
      qc.setQueryData<PollData>(pollKeys.detail(pollId as string), data);
    },
    onError: invalidate,
  });

  const addOptionMutation = useMutation({
    mutationFn: (text: string) =>
      chatApi.addPollOption(pollId as string, text),
    onSuccess: (data) => {
      qc.setQueryData<PollData>(pollKeys.detail(pollId as string), data);
      setNewOptionText('');
    },
    onError: invalidate,
  });

  const isVoting = voteMutation.isPending || removeMutation.isPending;

  if (!pollId) {
    return (
      <span className="text-[13px] italic opacity-70">[Bình chọn không hợp lệ]</span>
    );
  }

  if (isLoading || !poll) {
    return (
      <div className="flex items-center gap-2 py-1 text-[13px] text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Đang tải bình chọn…</span>
      </div>
    );
  }

  // Tính unique voters (non-anonymous)
  const uniqueVoterIds = !poll.isAnonymous
    ? new Set(poll.options.flatMap((o) => o.voterIds ?? []))
    : null;
  const uniqueVoterCount = uniqueVoterIds?.size ?? 0;

  // hideResults: nếu user chưa bình chọn bất kỳ option nào VÀ hideResultsBeforeVote=true
  const hasVotedAny = poll.options.some((o) => o.hasVoted);
  const hideResults = poll.hideResultsBeforeVote && !hasVotedAny && !poll.isExpired;

  // Creator name
  const creatorMember = conversation?.members?.find((m) => m.userId === poll.creatorId);
  const creatorName = creatorMember?.displayName ?? creatorMember?.username ?? null;

  return (
    <div className="w-full min-w-[340px] max-w-[340px] space-y-2.5 rounded-xl border border-border bg-accent p-3.5 shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15">
          <BarChart2 className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-primary">{poll.question}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {creatorName ? `Tạo bởi ${creatorName} · ` : ''}
            {formatPollDate(poll.createdAt)}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Mode badge */}
      {poll.isMultiChoice && (
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          Chọn nhiều phương án
        </span>
      )}
      {poll.isExpired && (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          <Clock className="h-3 w-3" />
          Đã kết thúc
        </span>
      )}
      {poll.expiresAt && !poll.isExpired && (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          <Clock className="h-3 w-3" />
          Hết hạn {new Date(poll.expiresAt).toLocaleDateString('vi-VN')}
        </span>
      )}

      {/* Options */}
      <div className="space-y-1.5">
        {poll.options.map((opt) => (
          <PollOptionRow
            key={opt.id}
            option={opt}
            totalVotes={poll.totalVotes}
            isMultiChoice={poll.isMultiChoice}
            isExpired={poll.isExpired}
            isAnonymous={poll.isAnonymous}
            hideResults={hideResults}
            onVote={(id) => voteMutation.mutate(id)}
            onRemoveVote={(id) => removeMutation.mutate(id)}
            isVoting={isVoting}
          />
        ))}
      </div>

      {/* "Thêm lựa chọn" */}
      {poll.allowAddOptions && !poll.isExpired && (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={newOptionText}
            onChange={(e) => setNewOptionText(e.target.value)}
            placeholder="Thêm lựa chọn..."
            maxLength={200}
            className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[12.5px] placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newOptionText.trim() && !addOptionMutation.isPending) {
                e.preventDefault();
                addOptionMutation.mutate(newOptionText.trim());
              }
            }}
          />
          <button
            type="button"
            disabled={!newOptionText.trim() || addOptionMutation.isPending}
            onClick={() => {
              if (newOptionText.trim()) addOptionMutation.mutate(newOptionText.trim());
            }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Footer: voter stats — click để xem chi tiết */}
      <button
        type="button"
        onClick={() => setShowVoters(true)}
        className="flex w-full items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5 text-[11.5px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Users className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left">
          {!poll.isAnonymous && uniqueVoterCount > 0 ? (
            <>{uniqueVoterCount} người bình chọn · {poll.totalVotes} lượt</>
          ) : (
            <>{poll.totalVotes} lượt bình chọn</>
          )}
          {poll.isAnonymous && <span className="ml-1 opacity-70">· Ẩn danh</span>}
        </span>
        <span className="text-[10px] opacity-50">Xem chi tiết →</span>
      </button>

      {showVoters && (
        <PollVotersDialog
          open={showVoters}
          onOpenChange={setShowVoters}
          poll={poll}
          members={conversation?.members ?? []}
        />
      )}
    </div>
  );
}
