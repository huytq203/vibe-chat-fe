'use client';

import { useRef, useState } from 'react';
import { Check, ImageIcon, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button/Button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog/Dialog';
import { mediaApi } from '@/services/media.api';
import { chatKeys } from '@/services/keys';
import { CHAT_THEMES, getTheme } from '@/features/chat/config/chat-themes';
import { getBubblePreviewStyle, parseBackground } from '@/features/chat/hooks/useWallpaper';
import { useUpdateBackground } from '@/features/chat/hooks/use-mutations';
import type { Conversation } from '@/features/chat/types';

interface WallpaperPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
}

const SAMPLE_MESSAGES = [
  { id: 1, isMe: false, text: 'Có rất nhiều chủ đề để bạn lựa chọn.' },
  { id: 2, isMe: true, text: 'Tin nhắn mà bạn gửi sẽ có màu này.' },
  { id: 3, isMe: false, text: 'Tin nhắn của bạn bè sẽ tương tự như thế này.' },
  { id: 4, isMe: true, text: 'Nhấp vào Chọn để áp dụng chủ đề này.' },
];

function ThemePreview({ themeKey }: { themeKey: string }) {
  const theme = getTheme(themeKey);
  const { myStyle, otherStyle } = getBubblePreviewStyle(themeKey);
  const isDefault = themeKey === 'default' || !theme.wallpaper;

  const panelStyle: React.CSSProperties = theme.wallpaper
    ? theme.wallpaper.startsWith('url(')
      ? { backgroundImage: theme.wallpaper, backgroundSize: 'cover', backgroundPosition: 'center' }
      : theme.wallpaper.startsWith('linear-gradient') || theme.wallpaper.startsWith('radial-gradient')
        ? { backgroundImage: theme.wallpaper }
        : { backgroundColor: theme.wallpaper }
    : {};

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-xl',
        isDefault ? 'bg-background' : '',
      )}
      style={panelStyle}
    >
      <div className="flex flex-col gap-2 p-4">
        <div className="flex justify-center">
          <span className="rounded-full bg-black/20 px-3 py-0.5 text-[11px] text-white/70 backdrop-blur-sm">
            22:09
          </span>
        </div>
        {SAMPLE_MESSAGES.map((msg) => (
          <div
            key={msg.id}
            className={cn('flex', msg.isMe ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[75%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug',
                msg.isMe ? 'rounded-br-md' : 'rounded-bl-md',
                !msg.isMe && 'border border-white/10',
                isDefault &&
                  (msg.isMe
                    ? 'bg-primary text-primary-foreground'
                    : 'border-border bg-muted text-foreground'),
              )}
              style={!isDefault ? (msg.isMe ? myStyle : otherStyle) : undefined}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WallpaperPickerDialog({
  open,
  onOpenChange,
  conversationId,
}: WallpaperPickerDialogProps) {
  const qc = useQueryClient();
  const conv = qc.getQueryData<Conversation>(chatKeys.conversationDetail(conversationId));
  const { type, themeKey } = parseBackground(conv?.background);
  const currentThemeKey = type === 'theme' && themeKey ? themeKey : 'default';

  const [pendingKey, setPendingKey] = useState<string>(currentThemeKey);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate: updateBackground, isPending } = useUpdateBackground();

  function handleOpen(v: boolean) {
    if (v) setPendingKey(currentThemeKey);
    onOpenChange(v);
  }

  function handleConfirm() {
    const background = pendingKey === 'default' ? null : `theme:${pendingKey}`;
    updateBackground(
      { conversationId, background },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const res = await mediaApi.uploadDirect(file, 'AVATAR');
      updateBackground(
        { conversationId, background: `custom:${res.id}` },
        { onSuccess: () => onOpenChange(false) },
      );
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload thất bại');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-[680px] gap-0 overflow-hidden p-0">
        <div className="border-b border-border px-5 py-3.5">
          <DialogTitle className="text-[15px] font-semibold">
            Xem trước và chọn chủ đề
          </DialogTitle>
        </div>

        <div className="flex h-[440px]">
          {/* ── Left: danh sách theme ── */}
          <div className="flex w-[240px] shrink-0 flex-col overflow-y-auto border-r border-border">
            {CHAT_THEMES.map((theme) => {
              const isActive = pendingKey === theme.key;
              return (
                <button
                  key={theme.key}
                  type="button"
                  onClick={() => setPendingKey(theme.key)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                    isActive ? 'bg-accent' : 'hover:bg-muted/60',
                  )}
                >
                  <span
                    className="h-10 w-10 shrink-0 rounded-full border border-white/10"
                    style={{ background: theme.thumbnail }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-foreground">
                      {theme.label}
                    </span>
                    {theme.subtitle && (
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {theme.subtitle}
                      </span>
                    )}
                  </span>
                  {isActive && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              );
            })}

            {/* Upload custom */}
            <div className="border-t border-border px-3 py-2.5">
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="flex w-full items-center gap-3 rounded-lg py-1.5 text-left transition-colors hover:bg-muted/60 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-10 w-10 shrink-0 animate-spin rounded-full bg-muted p-2.5 text-muted-foreground" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  </span>
                )}
                <span className="text-[13px] font-medium text-foreground">
                  {uploading ? 'Đang tải...' : 'Ảnh của tôi'}
                </span>
              </button>
              {uploadError && (
                <p className="mt-1 text-[11px] text-destructive">{uploadError}</p>
              )}
            </div>
          </div>

          {/* ── Right: preview ── */}
          <div className="flex-1 overflow-hidden">
            <ThemePreview themeKey={pendingKey} />
          </div>
        </div>

        {/* ── Footer buttons ── */}
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleConfirm} disabled={isPending || uploading}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Chọn'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
