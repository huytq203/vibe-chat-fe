'use client';
import { useState } from 'react';
import { User, Users } from 'lucide-react';
import { Avatar as BaseAvatar } from '@/components/ui/avatar/Avatar';
import { cn } from '@/lib/utils/cn';

type AvatarSize = 'sm' | 'md' | 'lg';
export type AvatarStatus = 'online' | 'offline' | 'away';
type AvatarType = 'user' | 'group';

type ChatAvatarProps = {
  name: string | null | undefined;
  src?: string | null;
  /** Loại avatar: 'user' (1 người) hoặc 'group' (nhiều người) — quyết định icon fallback. */
  type?: AvatarType;
  size?: AvatarSize;
  status?: AvatarStatus | null;
  className?: string;
  /** Gọi khi ảnh lỗi (presigned URL hết hạn) — caller có thể refetch để lấy URL mới. */
  onImageError?: () => void;
};

const SIZE_CLASS: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 rounded-full',
  md: 'h-11 w-11 rounded-full',
  lg: 'h-[72px] w-[72px] rounded-full',
};

const ICON_CLASS: Record<AvatarSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-8 w-8',
};

const DOT_CLASS: Record<AvatarSize, string> = {
  sm: 'h-2.5 w-2.5 right-0 bottom-0',
  md: 'h-3 w-3 right-0.5 bottom-0.5',
  lg: 'h-3.5 w-3.5 right-1 bottom-1',
};

const STATUS_BG: Record<AvatarStatus, string> = {
  online: 'bg-success',
  away: 'bg-warning',
  offline: 'bg-muted-foreground',
};

export function Avatar({
  name,
  src,
  type = 'user',
  size = 'md',
  status,
  className,
  onImageError,
}: ChatAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const [prevSrc, setPrevSrc] = useState(src);
  if (prevSrc !== src) {
    setPrevSrc(src);
    setImgError(false);
  }

  const showImage = !!src && !imgError;
  const Icon = type === 'group' ? Users : User;

  return (
    <div className="relative shrink-0">
      {showImage ? (
        <BaseAvatar
          src={src ?? undefined}
          alt={name ?? ''}
          onImageError={() => {
            setImgError(true);
            onImageError?.();
          }}
          className={cn(SIZE_CLASS[size], className)}
        />
      ) : (
        <div
          className={cn(
            'flex items-center justify-center border border-border bg-white text-muted-foreground',
            SIZE_CLASS[size],
            className,
          )}
        >
          <Icon className={ICON_CLASS[size]} aria-hidden />
        </div>
      )}
      {status && (
        <span
          className={cn(
            'absolute rounded-full border-2 border-sidebar',
            DOT_CLASS[size],
            STATUS_BG[status],
          )}
        />
      )}
    </div>
  );
}
