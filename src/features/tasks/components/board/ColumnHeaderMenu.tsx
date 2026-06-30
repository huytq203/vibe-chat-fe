'use client';

import { useState } from 'react';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/Popover';
import { cn } from '@/lib/utils/cn';
import { COLUMN_COLORS, COLUMN_ICONS, type ColumnIconKey } from './column-style';

interface ColumnHeaderMenuProps {
  iconKey: ColumnIconKey;
  color: string;
  onIconChange: (key: ColumnIconKey) => void;
  onColorChange: (color: string) => void;
  onDelete: () => void;
}

export function ColumnHeaderMenu({
  iconKey,
  color,
  onIconChange,
  onColorChange,
  onDelete,
}: ColumnHeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setConfirmDelete(false); // reset bước xác nhận khi đóng menu
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
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
              onClick={() => onColorChange(c)}
              aria-label={`Màu ${c}`}
              style={{ backgroundColor: c }}
              className={cn(
                'h-6 w-6 rounded-full transition-transform hover:scale-110',
                color.toLowerCase() === c.toLowerCase() && 'ring-2 ring-foreground ring-offset-2 ring-offset-background',
              )}
            />
          ))}
        </div>

        <div className="mt-4 border-t border-border pt-3">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  handleOpenChange(false);
                }}
                className="flex-1 rounded-lg bg-destructive px-2 py-2 text-sm font-semibold text-destructive-foreground transition-opacity hover:opacity-90"
              >
                Xác nhận xóa
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                Hủy
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Xóa cột
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
