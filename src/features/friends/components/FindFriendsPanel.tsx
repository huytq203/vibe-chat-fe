'use client';

import { useState } from 'react';
import { Search, UserPlus, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog/Dialog';
import { Input } from '@/components/ui/input/Input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs/Tabs';
import { Badge } from '@/components/ui/badge/Badge';
import { Spinner } from '@/components/ui/spinner/Spinner';
import { useDebouncedValue } from '../hooks/useDebounce';
import {
  useIncomingFriendRequests,
  useUserSearch,
} from '../hooks/use-query';
import {
  useAcceptFriendRequest,
  useCancelFriendRequest,
  useRejectFriendRequest,
  useSendFriendRequest,
} from '../hooks/use-mutations';
import type { FriendRequest, SendFriendRequestInput, UserSearchItem } from '../types';
import { UserResultRow } from './UserResultRow';
import { IncomingRequestRow } from './IncomingRequestRow';
import { SendRequestDialog } from './SendRequestDialog';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onMessageUser?: (user: UserSearchItem) => void;
};

type TabId = 'search' | 'requests';

export function FindFriendsPanel({ open, onOpenChange, onMessageUser }: Props) {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<TabId>('search');
  const [targetForNickname, setTargetForNickname] = useState<UserSearchItem | null>(
    null,
  );

  const debouncedQuery = useDebouncedValue(query, 300);
  const trimmed = debouncedQuery.trim();
  const isShortQuery = trimmed.length > 0 && trimmed.length < 2;

  const search = useUserSearch(debouncedQuery);
  const incoming = useIncomingFriendRequests();

  const sendMut = useSendFriendRequest();
  const cancelMut = useCancelFriendRequest();
  const acceptMut = useAcceptFriendRequest();
  const rejectMut = useRejectFriendRequest();

  const incomingItems = incoming.data?.items ?? [];
  const searchItems = search.data?.items ?? [];

  const handleSend = (user: UserSearchItem) => {
    setTargetForNickname(user);
  };

  const handleConfirmSend = (input: { nickname?: string }) => {
    if (!targetForNickname) return;
    const payload: SendFriendRequestInput = {
      targetUserId: targetForNickname.id,
      nickname: input.nickname,
      source: 'SEARCH',
    };
    sendMut.mutate(payload, {
      onSuccess: () => setTargetForNickname(null),
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[88vh] max-h-[720px] max-w-2xl flex-col overflow-hidden p-0">
          <DialogHeader className="flex shrink-0 flex-row items-center gap-3 border-b border-border px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/15">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle>Tìm kiếm &amp; Kết bạn</DialogTitle>
              <DialogDescription>Khám phá người dùng mới</DialogDescription>
            </div>
          </DialogHeader>

          <div className="shrink-0 px-5 pt-4">
            <Input
              variant="filled"
              icon={<Search className="h-4 w-4" />}
              placeholder="Tìm theo username, email hoặc tên..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (tab !== 'search') setTab('search');
              }}
              autoFocus
            />
            {isShortQuery && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Nhập ít nhất 2 ký tự để tìm kiếm
              </p>
            )}
          </div>

          <div className="shrink-0 px-5 pt-3">
            <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)}>
              <TabsList size="sm" className="w-full">
                <TabsTrigger value="search" className="flex-1 gap-1.5">
                  <Search className="h-3.5 w-3.5" /> Tìm kiếm
                </TabsTrigger>
                <TabsTrigger value="requests" className="flex-1 gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Lời mời
                  {incomingItems.length > 0 && (
                    <Badge variant="default" size="sm">
                      {incomingItems.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-4 pt-2">
            {tab === 'search' && (
              <SearchPane
                query={trimmed}
                items={searchItems}
                isLoading={search.isFetching && trimmed.length >= 2}
                isError={search.isError}
                pendingTargetId={
                  sendMut.isPending
                    ? sendMut.variables?.targetUserId
                    : cancelMut.isPending
                    ? cancelMut.variables
                    : undefined
                }
                onSend={handleSend}
                onCancel={(u) => cancelMut.mutate(u.id)}
                onAccept={(u) => acceptMut.mutate(u.id)}
                onReject={(u) => rejectMut.mutate(u.id)}
                onMessage={onMessageUser}
              />
            )}
            {tab === 'requests' && (
              <RequestsPane
                isLoading={incoming.isLoading}
                items={incomingItems}
                pendingTargetId={
                  acceptMut.isPending
                    ? acceptMut.variables
                    : rejectMut.isPending
                    ? rejectMut.variables
                    : undefined
                }
                onAccept={(id) => acceptMut.mutate(id)}
                onReject={(id) => rejectMut.mutate(id)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <SendRequestDialog
        user={targetForNickname}
        isPending={sendMut.isPending}
        onClose={() => setTargetForNickname(null)}
        onSubmit={handleConfirmSend}
      />
    </>
  );
}

function SearchPane({
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
}: {
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
}) {
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
        {items.length} kết quả cho "{query}"
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

function RequestsPane({
  isLoading,
  items,
  pendingTargetId,
  onAccept,
  onReject,
}: {
  isLoading: boolean;
  items: FriendRequest[];
  pendingTargetId?: string;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
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

function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/40 text-muted-foreground">
        {icon}
      </div>
      <div className="text-sm font-semibold">{title}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
