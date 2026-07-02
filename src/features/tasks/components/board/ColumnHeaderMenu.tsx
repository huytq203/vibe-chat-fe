'use client';

import { useState } from 'react';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Button } from '@/components/ui/button/Button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/Popover';
import { cn } from '@/lib/utils/cn';
import { COLUMN_COLORS, COLUMN_ICONS, type ColumnIconKey } from './column-style';

interface ColumnHeaderMenuProps {
  columnName: string;
  iconKey: ColumnIconKey;
  color: string;
  /** Đang gọi API updateColumn — khoá chọn màu để tránh gửi chồng request. */
  isUpdating: boolean;
  /** Đang gọi API deleteColumn. */
  isDeleting: boolean;
  onIconChange: (key: ColumnIconKey) => void;
  onColorChange: (color: string) => void;
  /** Trả promise của mutation để dialog biết khi nào đóng / hiện lỗi. */
  onDelete: () => Promise<void>;
}

export function ColumnHeaderMenu({
  columnName,
  iconKey,
  color,
  isUpdating,
  isDeleting,
  onIconChange,
  onColorChange,
  onDelete,
}: ColumnHeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);

  const handleConfirmOpenChange = (next: boolean) => {
    setConfirmOpen(next);
    if (!next) setDeleteFailed(false); // reset thông báo lỗi khi đóng dialog
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleteFailed(false);
      await onDelete();
      setConfirmOpen(false);
    } catch {
      // Giữ dialog mở + báo lỗi để user thử lại; board không đổi vì mutation thất bại.
      setDeleteFailed(true);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger>
          <button
            type="button"
            className="p-0.5 text-white opacity-80 hover:opacity-100"
            aria-label="Tùy chọn cột"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" showArrow={false} align="end">
          <p className="mb-2 text-sm font-semibold text-foreground">Biểu tượng</p>
          <div className="grid grid-cols-6 gap-1.5">
            {(Object.keys(COLUMN_ICONS) as ColumnIconKey[]).map((key) => {
              const Icon = COLUMN_ICONS[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onIconChange(key)}
                  aria-label={key}
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-lg text-foreground transition-colors',
                    iconKey === key ? 'bg-primary/15 ring-2 ring-primary' : 'hover:bg-muted',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>

          <p className="mb-2 mt-4 text-sm font-semibold text-foreground">Màu header</p>
          <div className="grid grid-cols-7 gap-2">
            {COLUMN_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                disabled={isUpdating}
                onClick={() => onColorChange(c)}
                aria-label={`Màu ${c}`}
                style={{ backgroundColor: c }}
                className={cn(
                  'h-6 w-6 rounded-full transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50',
                  color.toLowerCase() === c.toLowerCase() && 'ring-2 ring-foreground ring-offset-2 ring-offset-background',
                )}
              />
            ))}
          </div>

          <div className="mt-4 border-t border-border pt-3">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => {
                setOpen(false);
                setConfirmOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Xóa cột
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <AlertDialog open={confirmOpen} onOpenChange={handleConfirmOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa cột?</AlertDialogTitle>
            <AlertDialogDescription>
              Cột <span className="font-semibold text-foreground">{columnName}</span> cùng toàn bộ
              nhiệm vụ bên trong sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteFailed && (
            <p className="text-xs text-danger">Xóa cột thất bại. Vui lòng thử lại.</p>
          )}
          <AlertDialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={isDeleting}>
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleConfirmDelete()}
              isLoading={isDeleting}
            >
              Xóa
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
