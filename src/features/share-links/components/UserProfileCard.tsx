'use client';

import { useRouter } from 'next/navigation';
import { Cake, Check, User, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/client';
import { friendsApi } from '@/services/friends.api';
import { useUserProfile } from '@/features/chat/hooks/use-query';
import type { FriendshipStatus } from '@/features/friends/types';
import type { ShareLinkUserPreview } from '../types';
import { useUseShareLink } from '../hooks/use-mutations';
import { ERROR_LABEL, GENDER_LABEL } from '../enums/invite';
import { formatDob } from '../utils';
import { InvitePhoneShell } from './InvitePhoneShell';
import { InviteTopBar } from './InviteTopBar';
import { InviteProfileCover } from './InviteProfileCover';
import { InviteActionButtons } from './InviteActionButtons';
import { InvitePhotoSection } from './InvitePhotoSection';
import { InviteMutualSection } from './InviteMutualSection';

type Props = { previewUser: ShareLinkUserPreview; code: string; onBack: () => void; modal?: boolean };

function StatItem({ value, label, accent }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5">
      <span className={accent ? 'text-[18px] font-extrabold text-primary' : 'text-[18px] font-extrabold text-foreground'}>{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

export function UserProfileCard({ previewUser, code, onBack, modal }: Props) {
  const router = useRouter();
  const useLink = useUseShareLink();
  const { data: profile, isLoading } = useUserProfile(previewUser.id);

  const friendship: FriendshipStatus = profile?.friendship ?? 'NONE';
  const displayName = profile?.displayName ?? previewUser.displayName ?? previewUser.username;
  const isFriend = friendship === 'ACCEPTED';
  const genderText = profile?.gender ? GENDER_LABEL[profile.gender] : null;
  const dobText = formatDob(profile?.dateOfBirth);

  async function handleAddFriend() {
    try {
      await useLink.mutateAsync(code);
      await friendsApi.sendRequest({ targetUserId: previewUser.id, source: 'LINK' });
      toast.success('Đã gửi lời mời kết bạn');
    } catch (e) {
      const errCode = e instanceof ApiError ? e.code : '';
      toast.error(ERROR_LABEL[errCode] ?? (e instanceof Error ? e.message : 'Có lỗi xảy ra'));
    }
  }

  const inner = (
    <>
      <InviteTopBar title="Trang cá nhân" onBack={onBack} />

      <div className="flex-1 overflow-y-auto">
        <InviteProfileCover
          displayName={displayName}
          avatarSrc={profile?.avatarUrl ?? previewUser.avatarUrl}
          seed={previewUser.id}
          coverUrl={profile?.coverUrl}
          isLoading={isLoading}
        />

        {/* Name + handle + status */}
        <div className="flex flex-col items-center px-5 pt-1 text-center">
          <div className="mb-[3px] flex items-center justify-center gap-2">
            {isLoading
              ? <div className="h-7 w-40 animate-pulse rounded-lg bg-secondary" />
              : <h1 className="text-[22px] font-extrabold tracking-[-0.3px] text-foreground">{displayName}</h1>
            }
            {isFriend && (
              <span className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/[0.13] px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                <Check className="h-3 w-3" /> Bạn bè
              </span>
            )}
          </div>
          <p className="mb-2 text-[13px] text-muted-foreground">@{previewUser.username}</p>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-success/[0.12] px-2.5 py-[4px] text-[11.5px] font-semibold text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Đang hoạt động
          </div>
        </div>

        {/* Stats */}
        <div className="mx-5 my-4 flex items-center rounded-2xl border border-border bg-secondary py-3">
          <StatItem value="—" label="Bạn bè" />
          <div className="h-7 w-px bg-border" />
          <StatItem value="—" label="Ảnh" />
          <div className="h-7 w-px bg-border" />
          <StatItem value="—" label="Bạn chung" accent />
        </div>

        {/* Action buttons */}
        <div className="px-5 pb-4">
          <InviteActionButtons friendship={friendship} pending={useLink.isPending}
            onAdd={handleAddFriend} onMessage={() => router.push('/chat')} />
        </div>

        {/* Pending received banner */}
        {friendship === 'PENDING_IN' && (
          <div className="mx-5 mb-4 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/[0.08] px-3.5 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-secondary-foreground">
              <UserPlus className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-foreground">Đã gửi cho bạn lời mời kết bạn</p>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">Đang chờ bạn chấp nhận</p>
            </div>
          </div>
        )}

        {/* Bio + personal info */}
        <div className="px-5 pb-4">
          <p className="mb-2.5 text-[11.5px] font-bold uppercase tracking-[0.5px] text-muted-foreground/60">Giới thiệu</p>
          {isLoading ? (
            <div className="space-y-1.5">
              <div className="h-3.5 w-full animate-pulse rounded bg-secondary" />
              <div className="h-3.5 w-3/4 animate-pulse rounded bg-secondary" />
            </div>
          ) : (
            <>
              {profile?.bio && <p className="mb-3 text-center text-[13.5px] leading-relaxed text-foreground/80">{profile.bio}</p>}
              <div className="space-y-[6px]">
                <div className="space-y-[6px] flex flex-col items-start px-3">
                {genderText && (
                  <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                    <User className="h-[13px] w-[13px] shrink-0" />
                    <span className="text-[12.5px]">Giới tính: <b className="font-semibold text-foreground">{genderText}</b></span>
                  </div>
                )}
                {dobText && (
                  <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                    <Cake className="h-[13px] w-[13px] shrink-0" />
                    <span className="text-[12.5px]">Sinh ngày: <b className="font-semibold text-foreground">{dobText}</b></span>
                  </div>
                )}

                </div>
              </div>
            </>
          )}
        </div>

        {/* Contact — friends only */}
        {isFriend && profile?.email && (
          <div className="px-5 pb-4">
            <p className="mb-2.5 text-[11.5px] font-bold uppercase tracking-[0.5px] text-muted-foreground/60">Thông tin liên hệ</p>
            <div className="flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-secondary px-3.5 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/[0.12] text-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg>
              </div>
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.4px] text-muted-foreground/60">Email</p>
                <p className="mt-0.5 text-[13.5px] font-medium text-foreground">{profile.email}</p>
              </div>
            </div>
          </div>
        )}

        <InvitePhotoSection isFriend={isFriend} />
        <InviteMutualSection count={0} />
      </div>
    </>
  );

  if (modal) return inner;
  return <InvitePhoneShell>{inner}</InvitePhoneShell>;
}
