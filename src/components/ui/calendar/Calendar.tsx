'use client';

import * as React from 'react';
import { DayPicker, type DateRange, type Matcher } from 'react-day-picker';
import * as locales from 'react-day-picker/locale';
import { tv } from 'tailwind-variants';
import { cn } from '@/lib/utils/cn';
import { CalendarPanel, type SharedDayProps } from './CalendarPanel';
import {
  DEFAULT_FROM_YEAR,
  DEFAULT_TO_YEAR,
  getInitialMonth,
  reconcileMonths,
  shiftMonth,
  type CalendarLocaleKey,
  type CalendarSize,
} from './calendarUtils';

const wrapperVariants = tv({
  base: 'inline-flex max-w-full overflow-x-auto rounded-xl border border-border bg-background text-foreground shadow-sm',
});

export type CalendarMode = 'single' | 'range' | 'multiple';

/** Props for the Calendar component */
export interface CalendarProps {
  /** Day cell size */
  size?: CalendarSize;
  /** Selection mode: single date, date range, or multiple dates */
  mode?: CalendarMode;
  /** Currently selected value (Date, DateRange, or Date[] depending on mode) */
  selected?: Date | DateRange | Date[];
  /** Callback fired when the selection changes */
  onSelect?: (value: Date | DateRange | Date[] | undefined) => void;
  /** Disable all dates before today */
  disablePastDates?: boolean;
  /** Disable all dates after today */
  disableFutureDates?: boolean;
  /** Disable the entire calendar */
  disabled?: boolean;
  /** Locale key from react-day-picker/locale (defaults to 'enUS') */
  locale?: CalendarLocaleKey;
  className?: string;
  /** Additional class name for the outer wrapper */
  wrapperClassName?: string;
  /** Number of independent month panels shown side by side */
  numberOfMonths?: number;
  /** Show days from adjacent months (ignored when several panels are shown) */
  showOutsideDays?: boolean;
  /** First selectable year in the month/year pickers */
  fromYear?: number;
  /** Last selectable year in the month/year pickers */
  toYear?: number;
}

const Calendar = React.forwardRef<HTMLDivElement, CalendarProps>(({
  mode = 'single',
  selected,
  onSelect,
  disablePastDates = false,
  disableFutureDates = false,
  disabled = false,
  locale = 'enUS',
  className,
  wrapperClassName,
  size = 'md',
  numberOfMonths = 1,
  showOutsideDays = true,
  fromYear = DEFAULT_FROM_YEAR,
  toYear = DEFAULT_TO_YEAR,
}, ref) => {
  const count = Math.max(1, numberOfMonths);
  const [months, setMonths] = React.useState<Date[]>(() => {
    const first = getInitialMonth(selected);
    return Array.from({ length: count }, (_, i) => shiftMonth(first, i));
  });

  // Keep the number of panels in sync when `numberOfMonths` changes.
  React.useEffect(() => {
    setMonths((prev) =>
      prev.length === count ? prev : Array.from({ length: count }, (_, i) => prev[i] ?? shiftMonth(prev[prev.length - 1], i - prev.length + 1)),
    );
  }, [count]);

  const getDisabled = (): Matcher | Matcher[] | undefined => {
    if (disabled) return true;
    if (disablePastDates && disableFutureDates) return () => true;
    if (disablePastDates) return { before: new Date() };
    if (disableFutureDates) return { after: new Date() };
    return undefined;
  };

  const renderDays = (shared: SharedDayProps) => {
    const common = { ...shared, disabled: getDisabled(), showOutsideDays: count > 1 ? false : shared.showOutsideDays };
    if (mode === 'range') {
      return <DayPicker {...common} mode="range" selected={selected as DateRange | undefined} onSelect={(d) => onSelect?.(d)} />;
    }
    if (mode === 'multiple') {
      return <DayPicker {...common} mode="multiple" selected={selected as Date[] | undefined} onSelect={(d) => onSelect?.(d)} />;
    }
    return <DayPicker {...common} mode="single" selected={selected as Date | undefined} onSelect={(d) => onSelect?.(d)} />;
  };

  return (
    <div ref={ref} className={wrapperVariants({ className: wrapperClassName })}>
      {months.map((month, i) => (
        <CalendarPanel
          key={i}
          month={month}
          onMonthChange={(m) => setMonths((prev) => reconcileMonths(prev.map((p, j) => (j === i ? m : p)), i))}
          renderDays={renderDays}
          locale={locale}
          dayPickerLocale={locales[locale]}
          fromYear={fromYear}
          toYear={toYear}
          size={size}
          showOutsideDays={showOutsideDays}
          className={cn('p-3.5', i > 0 && 'border-l border-border', className)}
        />
      ))}
    </div>
  );
});

Calendar.displayName = 'Calendar';

export { Calendar };
