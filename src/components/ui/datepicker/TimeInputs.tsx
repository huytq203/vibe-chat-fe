'use client';
import * as React from 'react';
import type { TimeFormat, TimeParts } from './datePickerUtils';

const options = (count: number) => Array.from({ length: count }, (_, i) => String(i).padStart(2, '0'));
const fieldClass =
  'h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground focus:border-primary focus:outline-none';

interface TimeInputsProps {
  parts: TimeParts;
  onChange: (parts: TimeParts) => void;
  timeFormat: TimeFormat;
  variant: 'input' | 'select';
}

const Select: React.FC<{ label: string; value: string; count: number; onChange: (v: string) => void }> = ({ label, value, count, onChange }) => (
  <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass}>
    {options(count).map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);

/** Compact time editors: a native time input or three selects. */
export const TimeInputs: React.FC<TimeInputsProps> = ({ parts, onChange, timeFormat, variant }) => {
  const showMinutes = timeFormat !== 'HH';
  const showSeconds = timeFormat === 'HH:mm:ss';

  if (variant === 'input') {
    return (
      <input
        type="time"
        aria-label="Time"
        value={showSeconds ? `${parts.h}:${parts.m}:${parts.s}` : `${parts.h}:${parts.m}`}
        step={showSeconds ? 1 : 60}
        onChange={(e) => {
          const [h = '00', m = '00', s = '00'] = e.target.value.split(':');
          onChange({ h: h.padStart(2, '0'), m: m.padStart(2, '0'), s: s.padStart(2, '0') });
        }}
        className={fieldClass}
      />
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Select label="Hours" value={parts.h} count={24} onChange={(h) => onChange({ ...parts, h })} />
      {showMinutes && <><span className="font-bold text-muted-foreground">:</span><Select label="Minutes" value={parts.m} count={60} onChange={(m) => onChange({ ...parts, m })} /></>}
      {showSeconds && <><span className="font-bold text-muted-foreground">:</span><Select label="Seconds" value={parts.s} count={60} onChange={(s) => onChange({ ...parts, s })} /></>}
    </div>
  );
};
TimeInputs.displayName = 'TimeInputs';
