'use client';

import type { Editor } from '@tiptap/react';
import { Baseline } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/Popover';
import { cn } from '@/lib/utils/cn';
import { RICH_COLORS } from '@/lib/editor/rich-presets';

type ColorPopoverProps = {
  editor: Editor;
  disabled?: boolean;
};

/** Chọn màu chữ từ whitelist preset. `default` → unsetColor (về màu theme). */
export function ColorPopover({ editor, disabled }: ColorPopoverProps) {
  const current = editor.getAttributes('textStyle').color as string | undefined;

  const apply = (cssVar: string, isDefault: boolean) => {
    const chain = editor.chain().focus();
    if (isDefault) chain.unsetColor().run();
    else chain.setColor(cssVar).run();
  };

  return (
    <Popover>
      <PopoverTrigger>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          aria-label="Màu chữ"
          title="Màu chữ"
          onMouseDown={(e) => e.preventDefault()}
          className="text-muted-foreground hover:text-foreground"
        >
          <Baseline className="h-[18px] w-[18px]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" sideOffset={8} showArrow={false} className="w-auto p-2">
        <div className="flex gap-1.5">
          {RICH_COLORS.map((c) => {
            const isDefault = c.key === 'default';
            const active = isDefault ? !current : current === c.cssVar;
            return (
              <button
                key={c.key}
                type="button"
                title={c.label}
                aria-label={c.label}
                aria-pressed={active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => apply(c.cssVar, isDefault)}
                style={{ backgroundColor: c.cssVar }}
                className={cn(
                  'h-6 w-6 rounded-full border border-border transition-transform hover:scale-110',
                  active && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
                )}
              />
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
