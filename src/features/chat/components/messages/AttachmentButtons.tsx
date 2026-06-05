'use client';

import { useRef, type ChangeEvent } from 'react';
import { Image as ImageIcon, Paperclip, Video } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import type { AttachmentKind } from '@/features/chat/hooks/useAttachments';

type AttachmentButtonsProps = {
  onFiles: (files: FileList, kind: AttachmentKind) => void;
  disabled?: boolean;
};

/** 3 nút đính kèm (ảnh / video / tệp) + các input file ẩn tương ứng. */
export function AttachmentButtons({ onFiles, disabled }: AttachmentButtonsProps) {
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleChange(kind: AttachmentKind) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) onFiles(e.target.files, kind);
      e.target.value = '';
    };
  }

  return (
    <>
      <input ref={imageRef} type="file" accept="image/*,video/*" multiple hidden onChange={handleChange('image')} />
      <input ref={fileRef} type="file" multiple hidden onChange={handleChange('file')} />

      <Button
        variant="ghost"
        size="icon-sm"
        title="Gửi ảnh"
        aria-label="Gửi ảnh"
        disabled={disabled}
        className="text-muted-foreground hover:text-primary"
        onClick={() => imageRef.current?.click()}
      >
        <ImageIcon className="h-[18px] w-[18px]" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Gửi tệp"
        aria-label="Gửi tệp"
        disabled={disabled}
        className="text-muted-foreground hover:text-primary"
        onClick={() => fileRef.current?.click()}
      >
        <Paperclip className="h-[18px] w-[18px]" />
      </Button>
    </>
  );
}
