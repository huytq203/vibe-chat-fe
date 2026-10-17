'use client';
import * as React from 'react';
import type { DatePreset } from './datePickerUtils';

interface DatePresetsProps {
  title: string;
  presets: DatePreset[];
  onPick: (preset: DatePreset) => void;
}

/** Quick-pick list: a side rail on wide screens, a wrapping chip row on small ones. */
export const DatePresets: React.FC<DatePresetsProps> = ({ title, presets, onPick }) => {
  if (presets.length === 0) return null;
  return (
    <div
      role="group"
      aria-label={title}
      className="flex w-40 shrink-0 flex-col gap-0.5 border-r border-border p-2 max-sm:w-auto max-sm:flex-row max-sm:flex-wrap max-sm:border-b max-sm:border-r-0"
    >
      <span className="px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground max-sm:hidden">
        {title}
      </span>
      {presets.map((p) => (
        <button
          key={p.label}
          type="button"
          onClick={() => onPick(p)}
          className="rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
};
DatePresets.displayName = 'DatePresets';
