'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AtSign, Cake, ChevronDown, ChevronUp, User, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog/Dialog';
import { Badge } from '@/components/ui/badge/Badge';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { Avatar } from '@/features/chat/components/common/Avatar';
import { useCommonGroups, useUserProfile } from '@/features/chat/hooks/use-query';
import type { FriendshipStatus } from '@/features/friends/types';
import type { Gender } from '@/features/auth';

type UserProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
};

const GENDER_LABEL: Partial<Record<Gender, string>> = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };

const FRIENDSHIP_LABEL: Partial<Record<FriendshipStatus, string>> = {
  ACCEPTED: 'Bạn bè',
  PENDING_OUT: 'Đã gửi lời mời',
  PENDING_IN: 'Chờ bạn chấp nhận',
  BLOCKED_BY_ME: 'Đã chặn',
};

/** YYYY-MM-DD → DD/MM/YYYY (giữ nguyên nếu không khớp). */
function formatDob(value: string | null | undefined): string | null {
  if (!value) return null;
  const [y, m, d] = value.split('-');
  return y && m && d ? `${d}/${m}/${y}` : value;
}

/** Modal xem hồ sơ user khác: GET /users/:id + tab "Nhóm chung" (26-common-groups.md). */
export function UserProfileDialog({ open, onOpenChange, userId }: UserProfileDialogProps) {
  const router = useRouter();
  const [groupsExpanded, setGroupsExpanded] = useState(false);
  const { data: profile, isLoading, isError } = useUserProfile(userId, open);
  // BE trả 400 nếu hỏi nhóm chung với chính mình → chỉ bật khi đã biết isMe=false.
  const groupsEnabled = open && Boolean(profile) && !profile?.isMe;
  const groupsQuery = useCommonGroups(userId, groupsEnabled);
  const groups = groupsQuery.data?.pages.flatMap((p) => p.items) ?? [];
  // API cursor-based không trả total → đã hết trang thì là số chính xác, còn trang = "N+".
  const groupCountLabel = groupsQuery.hasNextPage ? `${groups.length}+` : `${groups.length}`;

  const name = profile?.displayName ?? profile?.username ?? '—';
  const friendshipText = profile ? FRIENDSHIP_LABEL[profile.friendship] : undefined;
  const genderText = profile?.gender ? GENDER_LABEL[profile.gender] : null;
  const dobText = formatDob(profile?.dateOfBirth);

  function handleOpenChange(next: boolean) {
    if (!next) setGroupsExpanded(false);
    onOpenChange(next);
  }

  function openGroup(groupId: string) {
    handleOpenChange(false);
    router.push(`/chat/${groupId}`);
  }

  // Lazy load: cuộn gần cuối list nhóm → nạp trang kế tiếp.
  function handleGroupsScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    if (nearBottom && groupsQuery.hasNextPage && !groupsQuery.isFetchingNextPage) {
      void groupsQuery.fetchNextPage();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm overflow-hidden p-0">
        <DialogTitle className="sr-only">Thông tin người dùng</DialogTitle>

        {isError ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            Không tìm thấy người dùng
          </p>
        ) : (
          <div className="max-h-[80vh] overflow-y-auto">
            {/* Cover: ảnh bìa nếu có, ngược lại gradient (giống ProfileInfoView). */}
            <div className="h-28 overflow-hidden bg-gradient-to-br from-primary/30 via-accent to-secondary">
              {profile?.coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.coverUrl} alt="" className="h-full w-full object-cover" />
              )}
            </div>

            <div className="-mt-10 flex flex-col items-center px-6">
              {isLoading ? (
                <Skeleton rounded="full" className="h-[72px] w-[72px]" />
              ) : (
                <Avatar
                  name={name}
                  src={profile?.avatarUrl}
                  seed={profile?.id ?? 'user'}
                  size="lg"
                  className="ring-4 ring-background"
                />
              )}
              <div className="mt-2 text-center">
                {isLoading ? (
                  <Skeleton className="mx-auto h-5 w-40" />
                ) : (
                  <p className="text-[17px] font-bold text-foreground">{name}</p>
                )}
                {friendshipText && (
                  <Badge variant="secondary" size="sm" className="mt-1.5">
                    {friendshipText}
                  </Badge>
                )}
                {profile?.bio && (
                  <p className="mt-1.5 whitespace-pre-wrap break-words text-[13px] text-muted-foreground">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>

            <div className="px-6 pb-2 pt-4">
              <p className="mb-3 text-sm font-bold">Thông tin cá nhân</p>
              <div className="space-y-3">
                <InfoRow icon={<AtSign className="h-4 w-4 text-muted-foreground" />} label="Tên đăng nhập" value={profile?.username} isLoading={isLoading} />
                <InfoRow icon={<User className="h-4 w-4 text-muted-foreground" />} label="Giới tính" value={genderText} isLoading={isLoading} />
                <InfoRow icon={<Cake className="h-4 w-4 text-muted-foreground" />} label="Ngày sinh" value={dobText} isLoading={isLoading} />
              </div>
            </div>

            {groupsEnabled && (
              <div className="border-t border-border px-6 pb-6 pt-4">
                {groupsQuery.isLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : groups.length === 0 ? (
                  <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    <Users className="h-4 w-4" />
                    Chưa có nhóm chung
                  </p>
                ) : (
                  <>
                    {/* Header thu gọn: số lượng nhóm + toggle mở list. */}
                    <button
                      type="button"
                      onClick={() => setGroupsExpanded((v) => !v)}
                      aria-expanded={groupsExpanded}
                      className="flex w-full items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-bold transition-colors hover:bg-secondary"
                    >
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 text-left">
                        Nhóm chung
                        <span className="ml-1.5 text-[12px] font-semibold text-muted-foreground">
                          {groupCountLabel} nhóm
                        </span>
                      </span>
                      {groupsExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>

                    {groupsExpanded && (
                      <div
                        onScroll={handleGroupsScroll}
                        className="mt-2 flex max-h-56 flex-col gap-0.5 overflow-y-auto"
                      >
                        {groups.map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => openGroup(g.id)}
                            className="flex shrink-0 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-secondary"
                          >
                            <Avatar name={g.name ?? 'Nhóm'} src={g.avatarUrl} seed={g.id} size="sm" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13.5px] font-semibold text-foreground">
                                {g.name ?? 'Nhóm không tên'}
                              </span>
                              <span className="block text-[12px] text-muted-foreground">
                                {g.memberCount} thành viên
                              </span>
                            </span>
                          </button>
                        ))}
                        {groupsQuery.isFetchingNextPage && (
                          <p className="py-1.5 text-center text-[11px] text-muted-foreground">
                            Đang tải thêm...
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

type InfoRowProps = {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  isLoading: boolean;
};

function InfoRow({ icon, label, value, isLoading }: InfoRowProps) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <span className="w-24 shrink-0 text-[13px] text-muted-foreground">{label}</span>
      {isLoading ? (
        <Skeleton className="h-4 w-24" />
      ) : (
        <span className="text-[13px] font-medium text-foreground">{value ?? '—'}</span>
      )}
    </div>
  );
}
