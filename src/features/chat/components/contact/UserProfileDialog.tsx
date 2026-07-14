'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AtSign, Cake, Phone, User } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog/Dialog';
import { Badge } from '@/components/ui/badge/Badge';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { Avatar } from '@/features/chat/components/common/Avatar';
import { useUserProfile } from '@/features/chat/hooks/use-query';
import { useOpenDirectConversation } from '@/features/chat/hooks/use-mutations';
import { useShareContactToFriend } from '@/features/chat/hooks/useShareContactToFriend';
import { ReportDialog } from '@/features/reports/components/ReportDialog';
import { FriendPickerDialog } from './FriendPickerDialog';
import type { FriendshipStatus } from '@/features/friends/types';
import { isBotUser } from '@/features/friends/utils';
import type { Gender } from '@/features/auth';
import { UserProfileActions } from './UserProfileActions';
import { UserProfileExtraActions } from './UserProfileExtraActions';
import { CommonGroupsSection } from './CommonGroupsSection';

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

/** Modal xem hồ sơ user khác: GET /users/:id + nhóm chung + hành động kết bạn/nhắn tin. */
export function UserProfileDialog({ open, onOpenChange, userId }: UserProfileDialogProps) {
  const router = useRouter();
  const [reportOpen, setReportOpen] = useState(false);
  const [friendPickerOpen, setFriendPickerOpen] = useState(false);

  const { data: profile, isLoading, isError } = useUserProfile(userId, open);
  const openDirectMut = useOpenDirectConversation();
  const { share, isPending: isSharing } = useShareContactToFriend(userId ?? '');

  const groupsEnabled = open && Boolean(profile) && !profile?.isMe;

  const name = profile?.displayName ?? profile?.username ?? '—';
  const isBot = isBotUser(profile);
  const friendshipText = profile ? FRIENDSHIP_LABEL[profile.friendship] : undefined;
  const genderText = profile?.gender ? GENDER_LABEL[profile.gender] : null;
  const dobText = formatDob(profile?.dateOfBirth);

  const isHidden = (field: string) => profile?.hiddenFields?.includes(field) ?? false;
  const maskOrValue = (value: string | null | undefined, field: string, mask: string) =>
    value ?? (isHidden(field) ? mask : null);

  function handleMessage() {
    if (!userId) return;
    openDirectMut.mutate(userId, { onSuccess: () => onOpenChange(false) });
  }

  function openGroup(groupId: string) {
    onOpenChange(false);
    router.push(`/chat/${groupId}`);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm overflow-hidden p-0">
          <DialogTitle className="sr-only">Thông tin người dùng</DialogTitle>

          {isError ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Không tìm thấy người dùng
            </p>
          ) : (
            <div className="max-h-[80vh] overflow-y-auto">
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
                  {!isBot && friendshipText && (
                    <Badge variant="secondary" size="sm" className="mt-1.5">
                      {friendshipText}
                    </Badge>
                  )}
                  {profile && !profile.isMe && !isBot && profile.mutualFriendsCount > 0 && (
                    <p className="mt-1.5 text-[12.5px] text-muted-foreground">
                      {profile.mutualFriendsCount} bạn chung
                    </p>
                  )}
                  {profile?.bio && !isBot && (
                    <p className="mt-1.5 whitespace-pre-wrap break-words text-[13px] text-muted-foreground">
                      {profile.bio}
                    </p>
                  )}
                </div>
              </div>

              {profile && !profile.isMe && userId && (
                <UserProfileActions
                  userId={userId}
                  friendship={profile.friendship}
                  isBot={isBot}
                  onMessage={handleMessage}
                  isMessaging={openDirectMut.isPending}
                />
              )}

              <div className="px-6 pb-2 pt-4">
                <p className="mb-3 text-sm font-bold">{isBot ? 'Thông tin bot' : 'Thông tin cá nhân'}</p>
                <div className="space-y-3">
                  <InfoRow icon={<AtSign className="h-4 w-4 text-muted-foreground" />} label="Tên đăng nhập" value={profile?.username} isLoading={isLoading} />
                  {!isBot && (
                    <>
                      <InfoRow icon={<Phone className="h-4 w-4 text-muted-foreground" />} label="Số điện thoại" value={maskOrValue(profile?.phone ?? null, 'phone', '*********')} isLoading={isLoading} />
                      <InfoRow icon={<User className="h-4 w-4 text-muted-foreground" />} label="Giới tính" value={maskOrValue(genderText, 'gender', '****')} isLoading={isLoading} />
                      <InfoRow icon={<Cake className="h-4 w-4 text-muted-foreground" />} label="Ngày sinh" value={maskOrValue(dobText, 'dateOfBirth', '**/**/****')} isLoading={isLoading} />
                    </>
                  )}
                </div>
              </div>

              <CommonGroupsSection userId={userId} enabled={groupsEnabled} onOpenGroup={openGroup} />

              {profile && !profile.isMe && userId && (
                <UserProfileExtraActions
                  isFriend={profile.friendship === 'ACCEPTED'}
                  isBot={isBot}
                  isPending={isSharing}
                  onShareContact={() => setFriendPickerOpen(true)}
                  onReport={() => setReportOpen(true)}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Render ngoài Dialog chính để thoát khỏi nested dialog context của Base UI */}
      {userId && (
        <>
          <ReportDialog
            open={reportOpen}
            onOpenChange={setReportOpen}
            targetType="USER"
            targetId={userId}
          />
          <FriendPickerDialog
            open={friendPickerOpen}
            onOpenChange={setFriendPickerOpen}
            onPick={(targets) => { void share(targets); }}
          />
        </>
      )}
    </>
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
