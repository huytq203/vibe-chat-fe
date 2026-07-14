"use client";

import { Bot, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { BotFatherCommand } from "./botfather-commands";

type BotFatherCommandSuggestPopupProps = {
  items: BotFatherCommand[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelect: (command: BotFatherCommand) => void;
};

export function BotFatherCommandSuggestPopup({
  items,
  activeIndex,
  onActiveIndexChange,
  onSelect,
}: BotFatherCommandSuggestPopupProps) {
  if (items.length === 0) return null;

  return (
    <div
      role="listbox"
      aria-label="Gợi ý lệnh BotFather"
      className="mb-2 max-h-56 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg"
    >
      {items.map((command, index) => (
        <button
          key={command.name}
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          onMouseEnter={() => onActiveIndexChange(index)}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(command);
          }}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
            index === activeIndex ? "bg-primary/10" : "hover:bg-muted",
          )}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Bot className="h-4 w-4" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13px] font-semibold text-foreground">
              {command.usage}
            </span>
            <span className="truncate text-[11px] text-muted-foreground">
              {command.description}
            </span>
          </div>
          {index === activeIndex && (
            <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
        </button>
      ))}
    </div>
  );
}
