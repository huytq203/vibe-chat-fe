import { Avatar as BaseAvatar } from '@/components/ui/avatar/Avatar';
import { cn } from '@/lib/utils/cn';
import { getAvatarColor, getInitials } from '@/features/chat/utils';

type AvatarSize = 'sm' | 'md' | 'lg';
export type AvatarStatus = 'online' | 'offline' | 'away';

type ChatAvatarProps = {
  name: string | null | undefined;
  src?: string | null;
  seed?: string;
  size?: AvatarSize;
  status?: AvatarStatus | null;
  className?: string;
};

const SIZE_CLASS: Record<AvatarSize, string> = {
  sm: 'h-9 w-9 rounded-lg text-[11px]',
  md: 'h-11 w-11 rounded-xl text-[13px]',
  lg: 'h-[72px] w-[72px] rounded-2xl text-[22px]',
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

export function Avatar({ name, src, seed, size = 'md', status, className }: ChatAvatarProps) {
  const color = getAvatarColor(seed ?? name ?? '');
  const fallback = getInitials(name);
  return (
    <div className="relative shrink-0">
      <BaseAvatar
        src={src ?? undefined}
        alt={name ?? ''}
        fallback={fallback}
        className={cn(SIZE_CLASS[size], 'font-bold', className)}
        style={{
          background: `${color}22`,
          border: `1.5px solid ${color}44`,
          color,
        }}
      />
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
