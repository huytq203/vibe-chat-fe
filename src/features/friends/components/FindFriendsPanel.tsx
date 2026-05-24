'use client';

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
import { useFindFriends, type FindFriendsTab } from '../hooks/useFindFriends';
import type { UserSearchItem } from '../types';
import { SearchPane } from './SearchPane';
import { RequestsPane } from './RequestsPane';
import { SendRequestDialog } from './SendRequestDialog';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onMessageUser?: (user: UserSearchItem) => void;
};

export function FindFriendsPanel({ open, onOpenChange, onMessageUser }: Props) {
  const f = useFindFriends();

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
              value={f.query}
              onChange={(e) => f.setQuery(e.target.value)}
              autoFocus
            />
            {f.isShortQuery && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Nhập ít nhất 2 ký tự để tìm kiếm
              </p>
            )}
          </div>

          <div className="shrink-0 px-5 pt-3">
            <Tabs value={f.tab} onValueChange={(v) => f.setTab(v as FindFriendsTab)}>
              <TabsList size="sm" className="w-full">
                <TabsTrigger value="search" className="flex-1 gap-1.5">
                  <Search className="h-3.5 w-3.5" /> Tìm kiếm
                </TabsTrigger>
                <TabsTrigger value="requests" className="flex-1 gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Lời mời
                  {f.incoming.items.length > 0 && (
                    <Badge variant="default" size="sm">
                      {f.incoming.items.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-4 pt-2">
            {f.tab === 'search' && (
              <SearchPane
                query={f.trimmedQuery}
                items={f.search.items}
                isLoading={f.search.isLoading}
                isError={f.search.isError}
                pendingTargetId={f.search.pendingId}
                onSend={f.onSendClick}
                onCancel={f.onCancelRequest}
                onAccept={f.onAcceptUser}
                onReject={f.onRejectUser}
                onMessage={onMessageUser}
              />
            )}
            {f.tab === 'requests' && (
              <RequestsPane
                isLoading={f.incoming.isLoading}
                items={f.incoming.items}
                pendingTargetId={f.incoming.pendingId}
                onAccept={f.onAcceptRequest}
                onReject={f.onRejectRequest}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <SendRequestDialog
        user={f.nicknameTarget}
        isPending={f.isSending}
        onClose={f.closeNicknameDialog}
        onSubmit={f.onConfirmSend}
      />
    </>
  );
}
