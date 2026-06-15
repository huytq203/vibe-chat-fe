'use client';

import type { Editor } from '@tiptap/react';
import { Type } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/Popover';
import { cn } from '@/lib/utils/cn';
import { RICH_FONTS } from '@/lib/editor/rich-presets';

type FontPopoverProps = {
  editor: Editor;
  disabled?: boolean;
};

/** Chọn font từ whitelist preset. `default` → unsetFontFamily. */
export function FontPopover({ editor, disabled }: FontPopoverProps) {
  const current = editor.getAttributes('textStyle').fontFamily as string | undefined;

  const apply = (cssFamily: string, isDefault: boolean) => {
    const chain = editor.chain().focus();
    if (isDefault) chain.unsetFontFamily().run();
    else chain.setFontFamily(cssFamily).run();
  };

  return (
    <Popover>
      <PopoverTrigger>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          aria-label="Font chữ"
          title="Font chữ"
          onMouseDown={(e) => e.preventDefault()}
          className="text-muted-foreground hover:text-foreground"
        >
          <Type className="h-[18px] w-[18px]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" sideOffset={8} showArrow={false} className="w-40 p-1">
        <div className="flex flex-col">
          {RICH_FONTS.map((f) => {
            const isDefault = f.key === 'default';
            const active = isDefault ? !current : current === f.cssFamily;
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => apply(f.cssFamily, isDefault)}
                style={{ fontFamily: f.cssFamily }}
                className={cn(
                  'rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-muted',
                  active && 'bg-primary/15 text-primary',
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
