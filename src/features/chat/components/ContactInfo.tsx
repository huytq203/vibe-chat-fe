'use client';

import { useMemo, useState } from 'react';
import { Bell, BellOff, Phone, Pin, Search, Trash2, UserMinus, UserX, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs/Tabs';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { useAuthStore } from '@/features/auth';
import { useBlockedUsers, useFriends } from '@/features/friends/hooks/use-query';
import {
  useBlockUser,
  useUnblockUser,
  useUnfriend,
} from '@/features/friends/hooks/use-mutations';
import { useChatUIStore } from '../stores/chat-ui.store';
import { useSelectedConversation } from '../hooks/useSelectedConversation';
import { useConversation, usePresence } from '../hooks/use-query';
import { getConversationName, getConversationSeed } from '../utils';
import { Avatar } from './Avatar';
import { QuickAction } from './QuickAction';
import { OptionRow } from './OptionRow';

export function ContactInfo() {
  const meId = useAuthStore((s) => s.user?.id ?? null);
  const setRightOpen = useChatUIStore((s) => s.setRightOpen);
  const { selectedConversationId } = useSelectedConversation();
  const { data: conversation } = useConversation(selectedConversationId);
  const otherIds = conversation && conversation.type === 'DIRECT'
    ? conversation.memberIds.filter((id) => id !== meId)
    : [];
  const { data: presenceList } = usePresence(otherIds);
  const otherPresence = presenceList?.[0] ?? null;

  const [muted, setMuted] = useState(false);
  const [confirmUnfriendOpen, setConfirmUnfriendOpen] = useState(false);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);

  const otherUserId = otherIds[0] ?? null;
  const friendsQuery = useFriends();
  const blockedQuery = useBlockedUsers();
  const unfriendMut = useUnfriend();
  const blockMut = useBlockUser();
  const unblockMut = useUnblockUser();

  const isFriend = useMemo(() => {
    if (!otherUserId) return false;
    return Boolean(
      friendsQuery.data?.items.some((it) => it.user.id === otherUserId),
    );
  }, [friendsQuery.data, otherUserId]);

  const isBlocked = useMemo(() => {
    if (!otherUserId) return false;
    return Boolean(
      blockedQuery.data?.items.some((it) => it.user.id === otherUserId),
    );
  }, [blockedQuery.data, otherUserId]);

  if (!conversation) return null;

  const name = getConversationName(conversation, meId);
  const seed = getConversationSeed(conversation, meId);
  const isDirect = conversation.type === 'DIRECT';
  const canUnfriend = isDirect && isFriend && Boolean(otherUserId);
  const canBlock = isDirect && Boolean(otherUserId);
  const blockBusy = blockMut.isPending || unblockMut.isPending;

  const handleConfirmUnfriend = () => {
    if (!otherUserId) return;
    unfriendMut.mutate(otherUserId, {
      onSuccess: () => setConfirmUnfriendOpen(false),
    });
  };

  const handleConfirmBlock = () => {
    if (!otherUserId) return;
    if (isBlocked) {
      unblockMut.mutate(otherUserId, {
        onSuccess: () => setConfirmBlockOpen(false),
      });
    } else {
      blockMut.mutate(
        { targetUserId: otherUserId },
        { onSuccess: () => setConfirmBlockOpen(false) },
      );
    }
  };
  const status = otherPresence?.isOnline ? 'online' : otherPresence ? 'offline' : null;
  const statusText = otherPresence?.isOnline
    ? 'Đang hoạt động'
    : otherPresence?.lastSeenLabel ?? (conversation.type === 'DIRECT' ? 'Ngoại tuyến' : `${conversation.memberCount} thành viên`);
  const statusVariant: 'soft-success' | 'soft-warning' | 'secondary' = otherPresence?.isOnline
    ? 'soft-success'
    : 'secondary';

  return (
    <aside className="flex h-full w-[300px] min-w-[260px] shrink-0 flex-col border-l border-border bg-sidebar text-sidebar-foreground">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 pb-3 pt-[18px]">
        <span className="text-sm font-bold">Thông tin</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setRightOpen(false)}
          title="Đóng"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <section className="flex flex-col items-center border-b border-border px-4 pb-4 pt-5">
          <Avatar name={name} seed={seed} size="lg" status={status} className="mb-3" />
          <div className="text-[17px] font-bold text-foreground">{name}</div>
          <Badge variant={statusVariant} size="sm" className="mt-1.5">
            {statusText}
          </Badge>
        </section>

        <section className="grid grid-cols-4 gap-2 px-3 py-3">
          <QuickAction icon={<Phone className="h-[18px] w-[18px]" />} label="Gọi" />
          <QuickAction icon={<Video className="h-[18px] w-[18px]" />} label="Video" />
          <QuickAction icon={<Search className="h-[18px] w-[18px]" />} label="Tìm" />
          <QuickAction
            icon={muted ? <BellOff className="h-[18px] w-[18px]" /> : <Bell className="h-[18px] w-[18px]" />}
            label={muted ? 'Bỏ tắt' : 'Tắt t.báo'}
            active={muted}
            onClick={() => setMuted((m) => !m)}
          />
        </section>

        <section className="px-3 pt-2">
          <Tabs defaultValue="media">
            <TabsList size="xs" className="w-full">
              <TabsTrigger value="media" className="flex-1">Ảnh & Video</TabsTrigger>
              <TabsTrigger value="files" className="flex-1">Tài liệu</TabsTrigger>
              <TabsTrigger value="links" className="flex-1">Liên kết</TabsTrigger>
            </TabsList>
            <TabsContent value="media" className="py-3 text-center text-[11.5px] text-muted-foreground">
              Chưa có ảnh hoặc video được chia sẻ
            </TabsContent>
            <TabsContent value="files" className="py-3 text-center text-[11.5px] text-muted-foreground">
              Chưa có tệp được chia sẻ
            </TabsContent>
            <TabsContent value="links" className="py-3 text-center text-[11.5px] text-muted-foreground">
              Chưa có liên kết được chia sẻ
            </TabsContent>
          </Tabs>
        </section>

        <section className="px-3 pb-4 pt-2">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Tuỳ chọn
          </div>
          <div className="flex flex-col gap-0.5">
            <OptionRow icon={<Pin className="h-4 w-4" />} label="Ghim cuộc trò chuyện" />
            {canBlock && (
              <OptionRow
                icon={<UserX className="h-4 w-4" />}
                label={isBlocked ? 'Bỏ chặn người dùng' : 'Chặn người dùng'}
                danger={!isBlocked}
                onClick={() => setConfirmBlockOpen(true)}
              />
            )}
            {canUnfriend && (
              <OptionRow
                icon={<UserMinus className="h-4 w-4" />}
                label="Xóa bạn"
                danger
                onClick={() => setConfirmUnfriendOpen(true)}
              />
            )}
            <OptionRow icon={<Trash2 className="h-4 w-4" />} label="Xoá cuộc trò chuyện" danger />
          </div>
        </section>
      </div>

      <AlertDialog open={confirmUnfriendOpen} onOpenChange={setConfirmUnfriendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá bạn bè?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn sẽ huỷ kết bạn với <span className="font-semibold text-foreground">{name}</span>.
              Cuộc trò chuyện vẫn được giữ lại, nhưng để nhắn tin lại bạn có thể cần gửi
              lời mời kết bạn mới.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmUnfriendOpen(false)}
              disabled={unfriendMut.isPending}
            >
              Huỷ
            </Button>
            <Button
              variant="solid"
              className="bg-danger text-danger-foreground hover:bg-danger/90"
              onClick={handleConfirmUnfriend}
              isLoading={unfriendMut.isPending}
            >
              Xác nhận xoá
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmBlockOpen} onOpenChange={setConfirmBlockOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isBlocked ? 'Bỏ chặn người dùng?' : 'Chặn người dùng?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isBlocked ? (
                <>
                  Bạn sẽ bỏ chặn{' '}
                  <span className="font-semibold text-foreground">{name}</span>. Họ có
                  thể nhắn tin và gửi lời mời kết bạn cho bạn trở lại.
                </>
              ) : (
                <>
                  Bạn sẽ chặn{' '}
                  <span className="font-semibold text-foreground">{name}</span>. Họ
                  không thể nhắn tin, gọi điện hay xem thông tin cá nhân của bạn.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmBlockOpen(false)}
              disabled={blockBusy}
            >
              Huỷ
            </Button>
            <Button
              variant="solid"
              className={
                isBlocked
                  ? undefined
                  : 'bg-danger text-danger-foreground hover:bg-danger/90'
              }
              onClick={handleConfirmBlock}
              isLoading={blockBusy}
            >
              {isBlocked ? 'Xác nhận bỏ chặn' : 'Xác nhận chặn'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
