'use client';
import * as React from 'react';
import { Popover as BasePopover } from '@base-ui/react';
import type { DateRange } from 'react-day-picker';
import { Calendar as CalendarIcon, ChevronDown, Clock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { CalendarLocaleKey } from '../calendar/calendarUtils';
import { DatePickerContent } from './DatePickerContent';
import { useEditableDateInput } from './useEditableDateInput';
import {
  DEFAULT_LABELS,
  DEFAULT_TIME,
  applyTimeToDate,
  buildTimeString,
  dateToTimeParts,
  formatTriggerText,
  getDefaultPresets,
  parseTimeParts,
  type DatePickerLabels,
  type DatePickerMode,
  type DatePreset,
  type TimeFormat,
  type TimeParts,
  type TimePickerStyle,
} from './datePickerUtils';

export type { DatePickerMode, DatePreset, DatePickerLabels, TimeFormat, TimePickerStyle };

/** Props for the DatePicker component */
export interface DatePickerProps {
  /** Picker mode: single date, date range, or time-only */
  mode?: DatePickerMode;
  /** Selected date (Date for single, DateRange for range) */
  value?: Date | DateRange | string;
  /** Callback fired when the date changes */
  onChange?: (date: Date | DateRange | undefined) => void;
  /** Current time string, only used when mode is 'time-only' */
  timeValue?: string;
  /** Callback fired when the time value changes (time-only mode) */
  onTimeChange?: (time: string) => void;
  label?: string;
  /** Placeholder text when nothing is selected */
  placeholder?: string;
  /** Disable all dates before today */
  disablePastDates?: boolean;
  /** Vô hiệu hoá mọi ngày sau hôm nay */
  disableFutureDates?: boolean;
  /** Cho phép gõ tay ngày (dd/MM/yyyy) song song với chọn lịch — chỉ áp dụng mode 'single' */
  editable?: boolean;
  /** Show a time picker alongside the calendar (single mode) */
  showTime?: boolean;
  /** Time format: hours only, hours:minutes, or hours:minutes:seconds */
  timeFormat?: TimeFormat;
  /** Time picker UI: scroll columns (default), native input or selects */
  timePickerStyle?: TimePickerStyle;
  disabled?: boolean;
  className?: string;
  /** Helper text displayed below the picker */
  description?: string;
  /** Error message displayed below the picker (replaces description) */
  error?: string;
  required?: boolean;
  /** Quick picks. Defaults depend on the mode; pass `false` to hide them. */
  presets?: DatePreset[] | false;
  /** Override any UI text (i18n) */
  labels?: Partial<DatePickerLabels>;
  /** react-day-picker locale key (defaults to 'vi') */
  locale?: CalendarLocaleKey;
  /** First selectable year in the month/year pickers */
  fromYear?: number;
  /** Last selectable year in the month/year pickers */
  toYear?: number;
  /** @deprecated The header now always offers month and year pickers. */
  captionLayout?: 'label' | 'dropdown' | 'dropdown-months' | 'dropdown-years';
}

const POPUP_CLASS =
  'z-50 rounded-2xl border border-border bg-background text-foreground shadow-xl outline-none data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95';

export const DatePicker = React.forwardRef<HTMLDivElement, DatePickerProps>(({
  mode = 'single', value, onChange, timeValue, onTimeChange, label, placeholder, disablePastDates = false,
  disableFutureDates = false, editable = false,
  showTime = false, timeFormat = 'HH:mm:ss', timePickerStyle = 'columns', disabled = false, className,
  description, error, required, presets, labels: labelOverrides, locale = 'vi', fromYear, toYear,
}, ref) => {
  const labels = React.useMemo(() => ({ ...DEFAULT_LABELS, ...labelOverrides }), [labelOverrides]);
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const anchorRef = React.useRef<HTMLDivElement>(null);

  // Controlled when onChange is provided; `value` is then trusted even when undefined.
  const isControlled = onChange !== undefined;
  const [internalDate, setInternalDate] = React.useState<Date | DateRange | undefined>(undefined);
  const date = isControlled ? value : internalDate;
  const isTimeOnly = mode === 'time-only';

  const parts = React.useMemo<TimeParts>(() => {
    if (isTimeOnly && timeValue) return parseTimeParts(timeValue);
    if (date instanceof Date) return dateToTimeParts(date);
    return DEFAULT_TIME;
  }, [date, timeValue, isTimeOnly]);

  const commit = (next: Date | DateRange | undefined) => {
    if (!isControlled) setInternalDate(next);
    onChange?.(next);
  };

  const isEditable = editable && mode === 'single';
  const isAllowedDate = (d: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (disablePastDates && d < today) return false;
    return !(disableFutureDates && d > new Date());
  };
  const dateInput = useEditableDateInput(date instanceof Date ? date : undefined, commit, isAllowedDate);

  const handlePartsChange = (next: TimeParts) => {
    if (isTimeOnly) return onTimeChange?.(buildTimeString(next, timeFormat));
    commit(applyTimeToDate(date instanceof Date ? date : new Date(), next));
  };

  const handleSelect = (selected: Date | DateRange | Date[] | undefined) => {
    if (!selected || Array.isArray(selected)) return commit(undefined);
    if (mode === 'single' && selected instanceof Date) {
      commit(showTime ? applyTimeToDate(selected, parts) : selected);
      if (!showTime) setOpen(false);
      return;
    }
    commit(selected);
  };

  const handlePreset = ({ value: v }: DatePreset) => {
    commit(v instanceof Date && showTime ? applyTimeToDate(v, parts) : v);
    if (mode === 'single' && !showTime) setOpen(false);
  };

  const handleNow = () => {
    const now = new Date();
    if (isTimeOnly) onTimeChange?.(buildTimeString(dateToTimeParts(now), timeFormat));
    else commit(showTime ? now : new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  };

  const resolvedPresets = presets === false ? [] : presets ?? (showTime ? [] : getDefaultPresets(mode, labels));
  const hasValue = isTimeOnly ? !!timeValue : mode === 'range' ? !!(date as DateRange | undefined)?.from : date instanceof Date;

  const triggerText = formatTriggerText(mode, date as Date | DateRange | undefined, timeValue, showTime, timeFormat);

  return (
    <div ref={ref} className={cn('flex w-full flex-col gap-1.5', className)}>
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </label>
      )}

      <BasePopover.Root open={open} onOpenChange={disabled ? undefined : setOpen}>
        {isEditable ? (
          <div
            ref={anchorRef}
            className={cn(
              'group flex h-10 w-full items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm transition-shadow focus-within:border-primary',
              error ? 'border-danger focus-within:border-danger' : 'border-border',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <CalendarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              type="text"
              inputMode="numeric"
              maxLength={10}
              disabled={disabled}
              placeholder={placeholder ?? labels.placeholder}
              aria-label={label}
              value={dateInput.inputValue}
              onChange={(e) => dateInput.onInputChange(e.target.value)}
              onBlur={dateInput.onInputBlur}
              className="min-w-0 flex-1 bg-transparent text-left text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            />
            <BasePopover.Trigger
              render={
                <button type="button" disabled={disabled} aria-label="Mở lịch" className="shrink-0">
                  <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-data-popup-open:rotate-180" aria-hidden="true" />
                </button>
              }
            />
          </div>
        ) : (
        <BasePopover.Trigger
          render={
            <button
              ref={triggerRef}
              type="button"
              disabled={disabled}
              className={cn(
                'group flex h-10 w-full items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm transition-shadow',
                'hover:border-primary focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30',
                'disabled:cursor-not-allowed disabled:opacity-50',
                error ? 'border-danger' : 'border-border',
              )}
            >
              {isTimeOnly ? <Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : <CalendarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
              <span className={cn('flex-1 truncate text-left', !hasValue && 'text-muted-foreground')}>
                {hasValue ? triggerText : placeholder ?? labels.placeholder}
              </span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-popup-open:rotate-180" aria-hidden="true" />
            </button>
          }
        />
        )}
        <BasePopover.Portal>
          {/* z-[200]: popover phải nổi trên dialog (z-[100]) theo thang lớp của Halo. */}
          <BasePopover.Positioner anchor={isEditable ? anchorRef : triggerRef} sideOffset={6} className="z-[200]">
            <BasePopover.Popup className={POPUP_CLASS}>
              <DatePickerContent
                mode={mode}
                date={date as Date | DateRange | undefined}
                parts={parts}
                showTime={showTime}
                timeFormat={timeFormat}
                timePickerStyle={timePickerStyle}
                presets={resolvedPresets}
                labels={labels}
                locale={locale}
                fromYear={fromYear}
                toYear={toYear}
                disablePastDates={disablePastDates}
                disableFutureDates={disableFutureDates}
                onSelectDate={handleSelect}
                onPartsChange={handlePartsChange}
                onPreset={handlePreset}
                onToday={handleNow}
                onClear={() => (isTimeOnly ? onTimeChange?.('') : commit(undefined))}
                onClose={() => setOpen(false)}
              />
            </BasePopover.Popup>
          </BasePopover.Positioner>
        </BasePopover.Portal>
      </BasePopover.Root>

      {description && !error && <p className="text-[0.8rem] text-muted-foreground">{description}</p>}
      {error && <p className="text-[0.8rem] font-medium text-danger">{error}</p>}
    </div>
  );
});
DatePicker.displayName = 'DatePicker';
