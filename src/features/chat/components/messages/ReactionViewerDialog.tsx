'use client';

import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog/Dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs/Tabs';
import { Spinner } from '@/components/ui/spinner/Spinner';
import { EmojiText } from '@/components/common/EmojiText';
import { Avatar } from '@/features/chat/components/common/Avatar';
import { useConversation, useReactors } from '@/features/chat/hooks/use-query';
import { REACTION_EMOJI } from '@/features/chat/reactions';
import type { MessageReaction, ReactionType } from '@/features/chat/types';

type ReactionViewerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  messageId: string;
  reactions: MessageReaction[];
  initialType: ReactionType | null;
};

const ALL = 'ALL' as const;
type TabValue = typeof ALL | ReactionType;

/** Popup "ai đã thả cảm xúc": tab Tất cả + theo loại, mỗi dòng avatar + tên + emoji. */
export function ReactionViewerDialog({
  open,
  onOpenChange,
  conversationId,
  messageId,
  reactions,
  initialType,
}: ReactionViewerDialogProps) {
  const [tab, setTab] = useState<TabValue>(initialType ?? ALL);
  const total = useMemo(() => reactions.reduce((s, r) => s + r.count, 0), [reactions]);

  const { data: conversation } = useConversation(open ? conversationId : null);
  const memberMap = useMemo(() => {
    const map = new Map<string, { name: string; avatarUrl: string | null }>();
    for (const m of conversation?.members ?? []) {
      map.set(m.userId, { name: m.nickname || m.displayName || m.username, avatarUrl: m.avatarUrl });
    }
    return map;
  }, [conversation]);

  const query = useReactors(conversationId, messageId, tab === ALL ? undefined : tab, open);
  const reactors = query.data?.pages.flatMap((p) => p.items) ?? [];

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 60 && query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm overflow-hidden p-0">
        <DialogTitle className="px-5 pb-2 pt-4 text-sm font-bold">Cảm xúc</DialogTitle>

        <div className="px-3">
          <Tabs value={tab} onValueChange={(v) => setTab((v as TabValue) ?? ALL)}>
            <TabsList size="xs" className="w-full overflow-x-auto">
              <TabsTrigger value={ALL} className="gap-1">
                Tất cả <span className="tabular-nums">{total}</span>
              </TabsTrigger>
              {reactions.map((r) => (
                <TabsTrigger key={r.type} value={r.type} className="gap-1">
                  <EmojiText text={REACTION_EMOJI[r.type]} className="leading-none" />
                  <span className="tabular-nums">{r.count}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div onScroll={handleScroll} className="max-h-[50vh] min-h-[120px] overflow-y-auto px-2 py-2">
          {query.isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="sm" />
            </div>
          ) : query.isError ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Không tải được danh sách</p>
          ) : reactors.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Chưa có ai thả cảm xúc</p>
          ) : (
            reactors.map((reactor) => {
              const info = memberMap.get(reactor.userId);
              const name = info?.name ?? 'Người dùng';
              return (
                <div key={`${reactor.userId}-${reactor.type}`} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
                  <Avatar name={name} src={info?.avatarUrl} seed={reactor.userId} size="sm" status={null} />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-foreground">{name}</span>
                  <EmojiText text={REACTION_EMOJI[reactor.type]} className="text-base leading-none" />
                </div>
              );
            })
          )}
          {query.isFetchingNextPage && (
            <p className="py-2 text-center text-[11px] text-muted-foreground">Đang tải thêm...</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
