'use client';

import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/Popover';
import { cn } from '@/lib/utils/cn';
import { sanitizeLinkUrl } from '@/lib/editor/rich-presets';

type LinkPopoverProps = {
  editor: Editor;
  active: boolean;
  disabled?: boolean;
};

/** Chèn/sửa liên kết qua popover ngay trên ô soạn (nhập text hiển thị + URL). */
export function LinkPopover({ editor, active, disabled }: LinkPopoverProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');

  // Mở popover → nạp text đang chọn + URL hiện tại (nếu caret trong 1 link).
  const handleOpenChange = (next: boolean) => {
    if (next) {
      const { from, to } = editor.state.selection;
      setText(editor.state.doc.textBetween(from, to, ' '));
      setUrl((editor.getAttributes('link').href as string | undefined) ?? '');
    }
    setOpen(next);
  };

  const apply = () => {
    const href = sanitizeLinkUrl(url);
    if (!href) return;
    const { from, to } = editor.state.selection;
    const selected = editor.state.doc.textBetween(from, to, ' ');
    const label = text.trim();
    const chain = editor.chain().focus();
    if (from === to) {
      // Không có vùng chọn → chèn text (hoặc chính URL) làm link.
      chain.insertContent({ type: 'text', text: label || href, marks: [{ type: 'link', attrs: { href } }] }).run();
    } else if (label && label !== selected) {
      // Đổi cả nội dung hiển thị của vùng chọn.
      chain.insertContentAt({ from, to }, { type: 'text', text: label, marks: [{ type: 'link', attrs: { href } }] }).run();
    } else {
      chain.extendMarkRange('link').setLink({ href }).run();
    }
    setOpen(false);
  };

  const remove = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          aria-label="Chèn liên kết"
          aria-pressed={active}
          title="Chèn liên kết"
          onMouseDown={(e) => e.preventDefault()}
          className={cn(
            'text-muted-foreground hover:text-foreground',
            active && 'bg-primary/15 text-primary hover:text-primary',
          )}
        >
          <LinkIcon className="h-[17px] w-[17px]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" sideOffset={8} showArrow={false} className="w-72 p-3">
        <div className="flex flex-col gap-2.5">
          <Input
            label="Văn bản hiển thị"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Văn bản"
          />
          <Input
            label="Liên kết"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                apply();
              }
            }}
          />
          <div className="mt-1 flex justify-end gap-2">
            {active && (
              <Button type="button" variant="ghost" size="sm" onClick={remove}>
                Gỡ liên kết
              </Button>
            )}
            <Button type="button" variant="solid" size="sm" onClick={apply}>
              Áp dụng
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
