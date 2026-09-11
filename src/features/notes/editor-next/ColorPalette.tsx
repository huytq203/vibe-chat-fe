"use client";

import { RotateCcw } from "lucide-react";
import type { MouseEvent } from "react";

import { Toggle } from "@/components/ui/toggle/Toggle";
import { cn } from "@/lib/utils/cn";

import { NOTE_COLORS, type NoteColorName, noteTextColor } from "./note-colors";

interface ColorPaletteProps {
  kind: "highlight" | "text";
  label?: string;
  onSelect: (color: NoteColorName | null) => void;
  selected: string | null;
}

function keepSelection(event: MouseEvent<HTMLButtonElement>): void {
  event.preventDefault();
}

export function ColorPalette({ kind, label, onSelect, selected }: ColorPaletteProps) {
  const prefix = label ?? (kind === "text" ? "Màu chữ" : "Highlight");
  return (
    <div
      aria-label={`Bảng ${prefix.toLocaleLowerCase("vi")}`}
      className="flex items-center gap-1"
      role="group"
    >
      <Toggle
        aria-label={`${prefix}: Mặc định`}
        className="size-8 border-transparent p-0 data-[state=on]:bg-accent"
        pressed={!selected}
        size="icon"
        title="Mặc định"
        variant="ghost"
        onMouseDown={keepSelection}
        onPressedChange={() => onSelect(null)}
      >
        <RotateCcw aria-hidden="true" className="size-4" />
      </Toggle>
      {NOTE_COLORS.map((color) => {
        const value = kind === "text" ? noteTextColor(color.key) : color.key;
        return (
          <Toggle
            key={color.key}
            aria-label={`${prefix}: ${color.label}`}
            className="size-8 border-transparent p-0 data-[state=on]:bg-accent"
            pressed={selected === value}
            size="icon"
            title={color.label}
            variant="ghost"
            onMouseDown={keepSelection}
            onPressedChange={() => onSelect(color.key)}
          >
            <span
              aria-hidden="true"
              className={cn(
                "notes-editor-next__color-swatch",
                kind === "highlight" && "notes-editor-next__color-swatch--highlight",
              )}
              data-note-color={color.key}
            />
          </Toggle>
        );
      })}
    </div>
  );
}
