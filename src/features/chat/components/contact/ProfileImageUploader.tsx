'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Camera } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Avatar } from '@/features/chat/components/common/Avatar';

type ProfileImageUploaderProps = {
  variant: 'avatar' | 'cover';
  /** URL ảnh đã lưu (avatarUrl/coverUrl) để hiển thị khi chưa chọn ảnh mới. */
  value: string | null;
  /** Ảnh vừa chọn — CHỈ preview cục bộ, chưa upload (upload khi submit). */
  pendingFile?: File | null;
  /** Người dùng yêu cầu gỡ ảnh → hiển thị fallback dù còn `value`. */
  removed?: boolean;
  /** Tên để dựng avatar fallback (chỉ dùng cho variant avatar). */
  name?: string | null;
  seed?: string;
  disabled?: boolean;
  /** Báo file vừa chọn cho parent (parent upload lúc submit). */
  onSelect: (file: File) => void;
};

/** Ô chọn ảnh hồ sơ/nhóm: chỉ preview ảnh đã chọn, KHÔNG upload (tránh ảnh rác). */
export function ProfileImageUploader({
  variant,
  value,
  pendingFile,
  removed,
  name,
  seed,
  disabled,
  onSelect,
}: ProfileImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  // ObjectURL preview cho file đang chờ; revoke khi đổi/unmount.
  const preview = useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : null),
    [pendingFile],
  );
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn tệp ảnh');
      return;
    }
    setError(null);
    onSelect(file);
  }

  const shown = removed ? null : (preview ?? value);

  return (
    <div className={cn('relative', variant === 'cover' ? 'h-28 w-full' : 'h-[72px] w-[72px]')}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        disabled={disabled}
        onChange={handleChange}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        aria-label={variant === 'avatar' ? 'Đổi ảnh đại diện' : 'Đổi ảnh bìa'}
        className={cn(
          'group relative block h-full w-full overflow-hidden',
          variant === 'cover'
            ? 'bg-gradient-to-br from-primary/30 via-accent to-secondary'
            : 'rounded-full ring-4 ring-background',
          'disabled:cursor-not-allowed',
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

        {/* Lớp phủ icon camera khi hover. */}
        <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white opacity-0 transition-opacity group-hover:opacity-100">
          <Camera className={variant === 'avatar' ? 'h-5 w-5' : 'h-6 w-6'} />
        </span>
      </button>
      {error && (
        <p className="absolute -bottom-5 left-0 w-max text-[11px] text-destructive">{error}</p>
      )}
    </div>
  );
}
