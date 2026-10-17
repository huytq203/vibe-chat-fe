'use client';
import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { Clock } from 'lucide-react';
import { Calendar } from '../calendar/Calendar';
import type { CalendarLocaleKey } from '../calendar/calendarUtils';
import { Button } from '../button/Button';
import { DatePresets } from './DatePresets';
import { TimeColumns } from './TimeColumns';
import { TimeInputs } from './TimeInputs';
import type { DatePickerLabels, DatePickerMode, DatePreset, TimeFormat, TimeParts, TimePickerStyle } from './datePickerUtils';

const BARE_CALENDAR = 'rounded-none border-0 bg-transparent shadow-none';
const FOOTER_LINK =
  'rounded-lg px-2 py-1.5 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-primary';

export interface DatePickerContentProps {
  mode: DatePickerMode;
  date: Date | DateRange | undefined;
  parts: TimeParts;
  showTime: boolean;
  timeFormat: TimeFormat;
  timePickerStyle: TimePickerStyle;
  presets: DatePreset[];
  labels: DatePickerLabels;
  locale: CalendarLocaleKey;
  fromYear?: number;
  toYear?: number;
  disablePastDates: boolean;
  disableFutureDates: boolean;
  onSelectDate: (value: Date | DateRange | Date[] | undefined) => void;
  onPartsChange: (parts: TimeParts) => void;
  onPreset: (preset: DatePreset) => void;
  onToday: () => void;
  onClear: () => void;
  onClose: () => void;
}

/** Popover body: presets, calendar(s), time controls and footer actions. */
export const DatePickerContent: React.FC<DatePickerContentProps> = (p) => {
  const isTimeOnly = p.mode === 'time-only';
  const isRange = p.mode === 'range';
  const withColumns = (isTimeOnly || (p.mode === 'single' && p.showTime)) && p.timePickerStyle === 'columns';
  const withInline = (isTimeOnly || (p.mode === 'single' && p.showTime)) && p.timePickerStyle !== 'columns';
  const showPresets = !isTimeOnly && p.presets.length > 0;

  return (
    <div className="flex max-h-[min(80vh,640px)] w-max max-w-[calc(100vw-1rem)] flex-col">
      <div className="flex min-h-0 flex-1 overflow-hidden max-sm:flex-col max-sm:overflow-y-auto">
        {showPresets && <DatePresets title={p.labels.quickPicks} presets={p.presets} onPick={p.onPreset} />}
        <div className="flex min-w-0 flex-col overflow-x-auto">
          <div className="flex">
            {!isTimeOnly && (
              <Calendar
                mode={isRange ? 'range' : 'single'}
                numberOfMonths={isRange ? 2 : 1}
                selected={p.date}
                onSelect={p.onSelectDate}
                locale={p.locale}
                disablePastDates={p.disablePastDates}
                disableFutureDates={p.disableFutureDates}
                fromYear={p.fromYear}
                toYear={p.toYear}
                wrapperClassName={BARE_CALENDAR}
              />
            )}
            {withColumns && <TimeColumns parts={p.parts} onChange={p.onPartsChange} timeFormat={p.timeFormat} labels={p.labels} className={isTimeOnly ? 'border-l-0 pb-3.5' : undefined} />}
          </div>
          {withInline && (
            <div className="flex flex-col gap-2 border-t border-border p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Clock className="size-3.5" aria-hidden="true" />
                <span>{p.timeFormat === 'HH' ? p.labels.hour : p.timeFormat === 'HH:mm' ? `${p.labels.hour} : ${p.labels.minute}` : `${p.labels.hour} : ${p.labels.minute} : ${p.labels.second}`}</span>
              </div>
              <TimeInputs parts={p.parts} onChange={p.onPartsChange} timeFormat={p.timeFormat} variant={p.timePickerStyle === 'input' ? 'input' : 'select'} />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border px-3.5 py-2.5">
        {isRange ? (
          <span />
        ) : (
          <button type="button" onClick={p.onToday} className={FOOTER_LINK}>
            {p.showTime || isTimeOnly ? p.labels.now : p.labels.today}
          </button>
        )}
        <div className="flex items-center gap-1">
          <button type="button" onClick={p.onClear} className={FOOTER_LINK}>{p.labels.clear}</button>
          <Button size="sm" onClick={p.onClose}>{isRange ? p.labels.apply : p.labels.ok}</Button>
        </div>
      </div>
    </div>
  );
};
DatePickerContent.displayName = 'DatePickerContent';
