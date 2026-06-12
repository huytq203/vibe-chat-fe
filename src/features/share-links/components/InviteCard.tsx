'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button/Button';
import { ApiError } from '@/lib/api/client';
import { friendsApi } from '@/services/friends.api';
import { Avatar } from '@/features/chat/components/common/Avatar';
import { useResolveShareLink } from '../hooks/use-query';
import { useUseShareLink } from '../hooks/use-mutations';

const ERROR_LABEL: Record<string, string> = {
  SHARE_LINK_NOT_FOUND: 'Link không tồn tại',
  SHARE_LINK_REVOKED: 'Link đã bị thu hồi',
  SHARE_LINK_EXPIRED: 'Link đã hết hạn',
  SHARE_LINK_EXHAUSTED: 'Link đã hết lượt dùng',
  CONVERSATION_MEMBER_BANNED: 'Bạn đã bị cấm khỏi nhóm',
  CONVERSATION_FULL: 'Nhóm đã đầy',
};

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        {children}
      </div>
    </div>
  );
}

/** Trang xem trước & dùng share link (deep link /i/{code}). */
export function InviteCard({ code }: { code: string }) {
  const { data, isLoading, isError } = useResolveShareLink(code);
  const useLink = useUseShareLink();
  const router = useRouter();

  async function handleUse() {
    try {
      const result = await useLink.mutateAsync(code);
      if (result.type === 'GROUP') {
        toast.success(result.group.joined ? 'Đã tham gia nhóm' : 'Mở nhóm');
        router.push(`/chat/${result.group.conversationId}`);
      } else {
        await friendsApi.sendRequest({ targetUserId: result.user.id, source: 'LINK' });
        toast.success('Đã gửi lời mời kết bạn');
      }
    } catch (e) {
      const code2 = e instanceof ApiError ? e.code : '';
      toast.error(ERROR_LABEL[code2] ?? (e instanceof Error ? e.message : 'Có lỗi xảy ra'));
    }
  }

  if (isLoading) {
    return (
      <Shell>
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </Shell>
    );
  }

  if (isError || !data) {
    return (
      <Shell>
        <div className="p-8 text-center">
          <p className="text-base font-semibold">Link không khả dụng</p>
          <p className="mt-1 text-sm text-muted-foreground">Link không tồn tại hoặc đã bị xoá.</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/chat')}>Về trang chính</Button>
        </div>
      </Shell>
    );
  }

  if (!data.isActive) {
    const reason = data.isRevoked
      ? 'Link đã bị thu hồi'
      : data.isExpired
        ? 'Link đã hết hạn'
        : data.isExhausted
          ? 'Link đã hết lượt dùng'
          : 'Link không còn hiệu lực';
    return (
      <Shell>
        <div className="p-8 text-center">
          <p className="text-base font-semibold">{reason}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/chat')}>Về trang chính</Button>
        </div>
      </Shell>
    );
  }

  if (data.type === 'GROUP' && data.group) {
    const g = data.group;
    return (
      <Shell>
        <div className="h-24 bg-gradient-to-br from-primary/30 via-accent to-secondary" />
        <div className="flex flex-col items-center px-6 pb-6 -mt-10">
          <Avatar name={g.name} src={g.avatarUrl} seed={g.id} size="lg" className="ring-4 ring-card" />
          <p className="mt-3 text-lg font-bold">{g.name ?? 'Nhóm chat'}</p>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> {g.memberCount} thành viên
          </p>
          {g.description && <p className="mt-2 text-center text-sm text-muted-foreground">{g.description}</p>}
          <Button variant="solid" className="mt-5 w-full" isLoading={useLink.isPending} onClick={handleUse}>
            <Users className="h-4 w-4" /> Tham gia nhóm
          </Button>
        </div>
      </Shell>
    );
  }

  if (data.type === 'USER' && data.user) {
    const u = data.user;
    return (
      <Shell>
        <div className="h-24 bg-gradient-to-br from-primary/30 via-accent to-secondary" />
        <div className="flex flex-col items-center px-6 pb-6 -mt-10">
          <Avatar name={u.displayName ?? u.username} src={u.avatarUrl} seed={u.id} size="lg" className="ring-4 ring-card" />
          <p className="mt-3 text-lg font-bold">{u.displayName ?? u.username}</p>
          <p className="text-sm text-muted-foreground">@{u.username}</p>
          <Button variant="solid" className="mt-5 w-full" isLoading={useLink.isPending} onClick={handleUse}>
            <UserPlus className="h-4 w-4" /> Kết bạn
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="p-8 text-center text-sm text-muted-foreground">Nội dung link đã bị xoá.</div>
    </Shell>
  );
}
