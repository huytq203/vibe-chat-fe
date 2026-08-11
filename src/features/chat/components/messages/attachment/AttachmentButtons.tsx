'use client';

import { useRef, type ChangeEvent } from 'react';
import { Image as ImageIcon, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import type { AttachmentKind } from '@/features/chat/hooks/useAttachments';

type AttachmentButtonsProps = {
  onFiles: (files: FileList, kind: AttachmentKind) => void;
  disabled?: boolean;
  variant?: 'toolbar' | 'menu';
  stickerMode?: boolean;
};

/** Hai lối chọn media/tệp, hiển thị dạng icon toolbar hoặc hàng trong menu. */
export function AttachmentButtons({
  onFiles,
  disabled,
  variant = 'toolbar',
  stickerMode = false,
}: AttachmentButtonsProps) {
  const imageRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleChange(kind: AttachmentKind) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) onFiles(e.target.files, kind);
      e.target.value = '';
    };
  }

  return (
    <>
      <input
        ref={imageRef}
        type="file"
        accept={stickerMode ? 'image/*' : 'image/*,video/*'}
        multiple={!stickerMode}
        hidden
        onChange={handleChange('image')}
      />
      <input ref={fileRef} type="file" multiple hidden onChange={handleChange('file')} />

      <Button
        variant="ghost"
        size={variant === 'toolbar' ? 'icon-sm' : 'sm'}
        title={stickerMode ? 'Gửi ảnh sticker' : 'Gửi ảnh'}
        aria-label={stickerMode ? 'Gửi ảnh sticker' : 'Gửi ảnh'}
        disabled={disabled}
        className={
          variant === 'toolbar'
            ? 'text-muted-foreground hover:text-primary'
            : 'min-h-11 w-full justify-start px-3 text-muted-foreground hover:text-foreground'
        }
        onClick={() => imageRef.current?.click()}
      >
        <ImageIcon className="h-[18px] w-[18px]" />
        {variant === 'menu' && <span>{stickerMode ? 'Ảnh sticker' : 'Ảnh & video'}</span>}
      </Button>
      {!stickerMode && <Button
        variant="ghost"
        size={variant === 'toolbar' ? 'icon-sm' : 'sm'}
        title="Gửi tệp"
        aria-label="Gửi tệp"
        disabled={disabled}
        className={
          variant === 'toolbar'
            ? 'text-muted-foreground hover:text-primary'
            : 'min-h-11 w-full justify-start px-3 text-muted-foreground hover:text-foreground'
        }
        onClick={() => fileRef.current?.click()}
      >
        <Paperclip className="h-[18px] w-[18px]" />
        {variant === 'menu' && <span>Tệp</span>}
      </Button>}
    </>
  );
}
