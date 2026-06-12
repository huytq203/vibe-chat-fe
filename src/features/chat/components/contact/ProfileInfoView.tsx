'use client';

import type { ReactNode } from 'react';
import { AtSign, Cake, Mail, Pen, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { Avatar } from '@/features/chat/components/common/Avatar';
import type { AuthUser, Gender } from '@/features/auth';

type ProfileInfoViewProps = {
  me: AuthUser | undefined;
  isLoading: boolean;
  onEdit: () => void;
};

// UNDISCLOSED bỏ qua → hiển thị '—'.
const GENDER_LABEL: Partial<Record<Gender, string>> = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };

/** YYYY-MM-DD → DD/MM/YYYY (giữ nguyên nếu không khớp). */
function formatDob(value: string | null | undefined): string | null {
  if (!value) return null;
  const [y, m, d] = value.split('-');
  return y && m && d ? `${d}/${m}/${y}` : value;
}

/** Màn hình xem thông tin tài khoản (cover + avatar + bio + các dòng thông tin). */
export function ProfileInfoView({ me, isLoading, onEdit }: ProfileInfoViewProps) {
  const genderText = me?.gender ? GENDER_LABEL[me.gender] : null;
  const dobText = formatDob(me?.dateOfBirth);

  return (
    <div className="w-1/2 shrink-0 flex flex-col justify-between">
      <div>
        {/* Ảnh bìa: dùng coverUrl nếu có, ngược lại gradient mặc định. */}
        <div className="h-28 overflow-hidden bg-gradient-to-br from-primary/30 via-accent to-secondary">
          {me?.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.coverUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="-mt-10 flex flex-col items-center px-6 pb-2">
          {isLoading ? (
            <Skeleton rounded="full" className="h-[72px] w-[72px]" />
          ) : (
            <Avatar
              name={me?.displayName ?? me?.username}
              src={me?.avatarUrl}
              seed={me?.id ?? 'me'}
              size="lg"
              className="ring-4 ring-background"
            />
          )}
          <div className="mt-2 text-center">
            {isLoading ? (
              <Skeleton className="mx-auto h-5 w-40" />
            ) : (
              <div className="flex items-center justify-center gap-2">
                <p className="text-[17px] font-bold text-foreground">
                  {me?.displayName ?? me?.username ?? '—'}
                </p>
                <button
                  type="button"
                  onClick={onEdit}
                  aria-label="Chỉnh sửa hồ sơ"
                  className="rounded-md p-1 transition-colors hover:bg-accent"
                >
                  <Pen className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            )}
            {me?.bio && (
              <p className="mt-1 whitespace-pre-wrap break-words text-[13px] text-muted-foreground">
                {me.bio}
              </p>
            )}
          </div>
        </div>
        <div className="px-6 pb-6 pt-3">
          <p className="mb-3 text-sm font-bold">Thông tin cá nhân</p>
          <div className="space-y-3">
            <InfoRow icon={<AtSign className="h-4 w-4 text-muted-foreground" />} label="Tên đăng nhập" value={me?.username} isLoading={isLoading} />
            <InfoRow icon={<Mail className="h-4 w-4 text-muted-foreground" />} label="Email" value={me?.email} isLoading={isLoading} />
            <InfoRow icon={<User className="h-4 w-4 text-muted-foreground" />} label="Giới tính" value={genderText} isLoading={isLoading} />
            <InfoRow icon={<Cake className="h-4 w-4 text-muted-foreground" />} label="Ngày sinh" value={dobText} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}

type InfoRowProps = {
  icon: ReactNode;
  label: string;
  value: string | null | undefined;
  isLoading: boolean;
};

function InfoRow({ icon, label, value, isLoading }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {isLoading ? <Skeleton className="mt-1 h-4 w-40" /> : <p className="text-sm text-foreground">{value ?? '—'}</p>}
      </div>
    </div>
  );
}
