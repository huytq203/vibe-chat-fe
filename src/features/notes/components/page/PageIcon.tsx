'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { EmojiPicker, prefetchEmojiPicker } from '@/components/common/EmojiPicker';
import { Button } from '@/components/ui/button/Button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover/Popover';
import { useUpdatePage } from '@/features/notes/hooks/use-mutations';

interface PageIconProps {
  pageId: string;
  icon: string | null;
}

function createPageIconTrigger(icon: string | null, isPending: boolean) {
  if (icon) {
    return (
      <Button
        variant="ghost" aria-label="Đổi icon trang" title="Đổi icon"
        className="mb-2 h-[78px] w-[78px] rounded-sm p-0 text-7xl hover:bg-sidebar-accent"
        disabled={isPending} onMouseEnter={prefetchEmojiPicker} onFocus={prefetchEmojiPicker}
      >
        <span className="leading-none" aria-hidden="true">{icon}</span>
      </Button>
    );
  }
  return (
    <Button
      variant="ghost" size="xs" aria-label="Thêm icon cho trang"
      className="absolute bottom-0 left-0 h-7 bg-sidebar/80 text-muted-foreground opacity-0 group-hover/icon:opacity-100 group-focus-within/icon:opacity-100 focus:opacity-100 hover:bg-sidebar-accent hover:text-foreground"
      disabled={isPending} onMouseEnter={prefetchEmojiPicker} onFocus={prefetchEmojiPicker}
    >
      Thêm icon
    </Button>
  );
}

interface PageIconPickerProps {
  icon: string | null;
  onUpdateIcon: (icon: string | null) => void;
}

function PageIconPicker({ icon, onUpdateIcon }: PageIconPickerProps) {
  return (
    <PopoverContent align="start" showArrow={false} className="w-auto overflow-hidden border-border bg-sidebar p-0">
      <EmojiPicker onSelect={onUpdateIcon} />
      {icon && (
        <Button
          variant="ghost" size="sm"
          className="w-full justify-start rounded-none border-t border-border text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          onClick={() => onUpdateIcon(null)}
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
          Xoá icon
        </Button>
      )}
    </PopoverContent>
  );
}

export function PageIcon({ pageId, icon }: PageIconProps) {
  const [isOpen, setIsOpen] = useState(false);
  const updatePage = useUpdatePage();

  function updateIcon(nextIcon: string | null) {
    updatePage.mutate({ id: pageId, input: { icon: nextIcon } });
    setIsOpen(false);
  }

  return (
    <div className={icon ? undefined : 'group/icon absolute bottom-full left-0 h-[78px] w-full'}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger render={createPageIconTrigger(icon, updatePage.isPending)} />
        <PageIconPicker icon={icon} onUpdateIcon={updateIcon} />
      </Popover>
    </div>
  );
}
