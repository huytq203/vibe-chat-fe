'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Avatar } from '@/features/chat/components/common/Avatar';
import { useImageUpload } from '@/features/auth';

type ProfileImageUploaderProps = {
  variant: 'avatar' | 'cover';
  /** URL ảnh hiện tại (avatarUrl/coverUrl từ hồ sơ) để hiển thị ban đầu. */
  value: string | null;
  /** Tên để dựng avatar fallback (chỉ dùng cho variant avatar). */
  name?: string | null;
  seed?: string;
  disabled?: boolean;
  /** Trả mediaId sau khi upload thành công (để gửi avatarMediaId/coverMediaId). */
  onUploaded: (mediaId: string) => void;
};

/** Ô chọn + upload ảnh hồ sơ (avatar tròn / ảnh bìa banner), có preview + tiến trình. */
export function ProfileImageUploader({
  variant,
  value,
  name,
  seed,
  disabled,
  onUploaded,
}: ProfileImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  // Cả avatar lẫn ảnh bìa dùng category AVATAR (ảnh hồ sơ, ≤5MB). THUMBNAIL chỉ 2MB → quá nhỏ cho bìa.
  const { upload, uploading, progress, error } = useImageUpload('AVATAR');

  // Revoke object URL preview khi đổi/unmount.
  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setLocalPreview(preview); // giữ preview cục bộ tới khi đóng — hiển thị ảnh vừa chọn
    const uploaded = await upload(file);
    if (uploaded) onUploaded(uploaded.id);
    else {
      setLocalPreview(null);
      URL.revokeObjectURL(preview);
    }
  }

  const shown = localPreview ?? value;

  return (
    <div className={cn('relative', variant === 'cover' ? 'h-28 w-full' : 'h-[72px] w-[72px]')}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        disabled={disabled || uploading}
        onChange={handleChange}
      />
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        aria-label={variant === 'avatar' ? 'Đổi ảnh đại diện' : 'Đổi ảnh bìa'}
        className={cn(
          'group relative block h-full w-full overflow-hidden',
          variant === 'cover'
            ? 'bg-gradient-to-br from-primary/30 via-accent to-secondary'
            : 'rounded-full ring-4 ring-background',
          'disabled:cursor-wait',
        )}
      >
        {variant === 'avatar' ? (
          shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            <Avatar name={name ?? null} seed={seed} size="lg" className="h-full w-full" />
          )
        ) : shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="" className="h-full w-full object-cover" />
        ) : null}

        {/* Lớp phủ icon camera khi hover (hoặc luôn hiện ở góc avatar). */}
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center bg-black/35 text-white transition-opacity',
            uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
        >
          {uploading ? (
            <span className="flex items-center gap-1.5 text-xs font-medium">
              <Loader2 className="h-4 w-4 animate-spin" />
              {progress}%
            </span>
          ) : (
            <Camera className={variant === 'avatar' ? 'h-5 w-5' : 'h-6 w-6'} />
          )}
        </span>
      </button>
      {error && (
        <p className="absolute -bottom-5 left-0 w-max text-[11px] text-destructive">{error}</p>
      )}
    </div>
  );
}
