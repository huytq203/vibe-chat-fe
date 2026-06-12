import { PHOTO_HUES } from '../enums/invite';

export function InvitePhotoSection({ isFriend }: { isFriend: boolean }) {
  return (
    <div className="px-5 pb-4">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-[11.5px] font-bold uppercase tracking-[0.5px] text-muted-foreground/60">Ảnh</p>
        {isFriend && (
          <button type="button" className="text-[12px] font-semibold text-secondary-foreground">
            Xem tất cả
          </button>
        )}
      </div>

      {isFriend ? (
        <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-xl">
          {PHOTO_HUES.map((hue, i) => (
            <div
              key={i}
              className="flex aspect-square cursor-pointer items-center justify-center"
              style={{ background: `linear-gradient(135deg,${hue}33,${hue}11)` }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={hue + '66'}>
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
              </svg>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-secondary py-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="text-border">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <span className="mt-1.5 text-[12.5px] text-muted-foreground">Kết bạn để xem ảnh</span>
        </div>
      )}
    </div>
  );
}
