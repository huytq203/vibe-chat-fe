import { Avatar } from '@/features/chat/components/common/Avatar';

type Props = {
  displayName: string;
  avatarSrc: string | null | undefined;
  seed: string;
  coverUrl: string | null | undefined;
  isLoading: boolean;
};

export function InviteProfileCover({ displayName, avatarSrc, seed, coverUrl, isLoading }: Props) {
  return (
    <div className="relative mb-[52px]">
      <div
        className="relative h-[130px] overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #7f49e055 0%, #1a1425 100%)' }}
      >
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.08 }} preserveAspectRatio="none">
          <defs>
            <pattern id="pgrid" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M32 0L0 0 0 32" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#pgrid)" />
        </svg>
        <div style={{ position: 'absolute', top: '-30%', left: '30%', width: 200, height: 200, borderRadius: '50%', background: '#7f49e040', filter: 'blur(60px)' }} />
        {coverUrl && <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      </div>

      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
        {isLoading ? (
          <div className="h-[88px] w-[88px] animate-pulse rounded-3xl bg-secondary shadow-[0_8px_32px_rgba(0,0,0,0.5)]" />
        ) : (
          <div className="relative h-[88px] w-[88px]">
            <Avatar
              name={displayName} src={avatarSrc} seed={seed} size="lg"
              className="!h-[88px] !w-[88px] !rounded-3xl !text-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
            />
            <span className="absolute bottom-[3px] right-[3px] h-4 w-4 rounded-full border-[3px] border-muted bg-success" />
          </div>
        )}
      </div>
    </div>
  );
}
