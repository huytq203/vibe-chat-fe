'use client';

import { useState } from 'react';
import { ChevronLeft, ImageIcon, Lock, LockOpen, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog/Dialog';
import { WallpaperPickerDialog } from './WallpaperPickerDialog';

type View = 'menu';

interface ConversationSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  isLocked: boolean;
  isDirect: boolean;
  canDelete: boolean;
  onLockToggle: () => void;
  onDelete: () => void;
}

export function ConversationSettingsDialog({
  open,
  onOpenChange,
  conversationId,
  isLocked,
  isDirect,
  canDelete,
  onLockToggle,
  onDelete,
}: ConversationSettingsDialogProps) {
  const [view] = useState<View>('menu');
  const [wallpaperOpen, setWallpaperOpen] = useState(false);

  function handleClose() {
    onOpenChange(false);
  }

  function handleLock() {
    handleClose();
    onLockToggle();
  }

  function handleDelete() {
    handleClose();
    onDelete();
  }

  function handleOpenWallpaper() {
    handleClose();
    setWallpaperOpen(true);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="max-w-sm p-0">
          <div className="p-4">
            <div className="mb-4 flex items-center gap-2">
              {view !== 'menu' && (
                <Button variant="ghost" size="icon-sm" onClick={() => {}}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              <DialogTitle className="text-[15px] font-semibold">
                Cài đặt cuộc trò chuyện
              </DialogTitle>
            </div>

            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={handleOpenWallpaper}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-foreground transition-colors hover:bg-muted"
              >
                <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>Đổi chủ đề & hình nền</span>
              </button>

              {isDirect && (
                <button
                  type="button"
                  onClick={handleLock}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-foreground transition-colors hover:bg-muted"
                >
                  {isLocked ? (
                    <LockOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span>{isLocked ? 'Tắt khoá hội thoại' : 'Khoá hội thoại'}</span>
                </button>
              )}

              {canDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-danger transition-colors hover:bg-danger/10"
                >
                  <Trash2 className="h-4 w-4 shrink-0" />
                  <span>Xoá cuộc trò chuyện</span>
                </button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <WallpaperPickerDialog
        open={wallpaperOpen}
        onOpenChange={setWallpaperOpen}
        conversationId={conversationId}
      />
    </>
  );
}
