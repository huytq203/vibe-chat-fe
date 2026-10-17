import * as locales from 'react-day-picker/locale';

export type CalendarLocaleKey = keyof typeof locales;
export type CalendarSize = 'sm' | 'md' | 'lg';

export const DEFAULT_FROM_YEAR = 1900;
export const DEFAULT_TO_YEAR = 2100;
export const YEARS_PER_BLOCK = 12;

export const startOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1);

export const shiftMonth = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth() + n, 1);

export const monthIndex = (d: Date): number => d.getFullYear() * 12 + d.getMonth();

/** BCP-47 tag used by Intl for the given react-day-picker locale key. */
export const getIntlTag = (key: CalendarLocaleKey): string =>
  (locales[key] as { code?: string } | undefined)?.code ?? 'en-US';

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export const getMonthLabel = (tag: string, month: number, style: 'long' | 'short' = 'long'): string =>
  capitalize(new Intl.DateTimeFormat(tag, { month: style }).format(new Date(2000, month, 1)));

export const clampYear = (year: number, from: number, to: number): number =>
  Math.min(Math.max(year, from), to);

/**
 * Keeps an ordered list of visible months strictly ascending after the month at
 * `changed` was edited: later panels are pushed forward, earlier ones pulled back.
 */
export function reconcileMonths(months: Date[], changed: number): Date[] {
  const next = [...months];
  for (let i = changed + 1; i < next.length; i++) {
    if (monthIndex(next[i]) <= monthIndex(next[i - 1])) next[i] = shiftMonth(next[i - 1], 1);
  }
  for (let i = changed - 1; i >= 0; i--) {
    if (monthIndex(next[i]) >= monthIndex(next[i + 1])) next[i] = shiftMonth(next[i + 1], -1);
  }
  return next;
}

/** First month that should be shown for a selection (single date, range or list). */
export function getInitialMonth(selected: Date | { from?: Date } | Date[] | undefined): Date {
  const first = Array.isArray(selected)
    ? selected[0]
    : selected instanceof Date
      ? selected
      : selected?.from;
  return startOfMonth(first ?? new Date());
}
