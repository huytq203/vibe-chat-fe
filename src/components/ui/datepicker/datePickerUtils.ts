import { format, startOfWeek, endOfWeek, addDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths } from 'date-fns';
import type { DateRange } from 'react-day-picker';

export type TimeFormat = 'HH' | 'HH:mm' | 'HH:mm:ss';
export type DatePickerMode = 'single' | 'range' | 'time-only';
export type TimePickerStyle = 'columns' | 'input' | 'select';

export interface TimeParts {
  h: string;
  m: string;
  s: string;
}

export interface DatePreset {
  label: string;
  value: Date | DateRange;
}

export interface DatePickerLabels {
  placeholder: string;
  quickPicks: string;
  today: string;
  tomorrow: string;
  now: string;
  clear: string;
  ok: string;
  apply: string;
  hour: string;
  minute: string;
  second: string;
  next7Days: string;
  next30Days: string;
  thisWeek: string;
  last7Days: string;
  last30Days: string;
  thisMonth: string;
  lastMonth: string;
  thisYear: string;
}

export const DEFAULT_LABELS: DatePickerLabels = {
  placeholder: 'Chọn ngày...',
  quickPicks: 'Gợi ý nhanh',
  today: 'Hôm nay',
  tomorrow: 'Ngày mai',
  now: 'Bây giờ',
  clear: 'Xóa',
  ok: 'OK',
  apply: 'Áp dụng',
  hour: 'Giờ',
  minute: 'Phút',
  second: 'Giây',
  next7Days: '7 ngày tới',
  next30Days: '30 ngày tới',
  thisWeek: 'Tuần này',
  last7Days: '7 ngày qua',
  last30Days: '30 ngày qua',
  thisMonth: 'Tháng này',
  lastMonth: 'Tháng trước',
  thisYear: 'Năm nay',
};

export const DEFAULT_TIME: TimeParts = { h: '00', m: '00', s: '00' };

const pad = (n: number | string): string => String(n).padStart(2, '0');

export function parseTimeParts(timeStr: string): TimeParts {
  const [h = '00', m = '00', s = '00'] = timeStr.split(':');
  return { h: pad(h), m: pad(m), s: pad(s) };
}

export function buildTimeString(parts: TimeParts, fmt: TimeFormat): string {
  if (fmt === 'HH') return parts.h;
  if (fmt === 'HH:mm') return `${parts.h}:${parts.m}`;
  return `${parts.h}:${parts.m}:${parts.s}`;
}

export function applyTimeToDate(base: Date, parts: TimeParts): Date {
  const d = new Date(base);
  d.setHours(Number(parts.h), Number(parts.m), Number(parts.s), 0);
  return d;
}

export function dateToTimeParts(d: Date): TimeParts {
  return { h: pad(d.getHours()), m: pad(d.getMinutes()), s: pad(d.getSeconds()) };
}

export function formatDateDisplay(d: Date, showTime: boolean, fmt: TimeFormat): string {
  const datePart = format(d, 'dd/MM/yyyy');
  if (!showTime) return datePart;
  if (fmt === 'HH') return `${datePart} ${format(d, 'HH')}h`;
  return `${datePart} ${format(d, fmt === 'HH:mm' ? 'HH:mm' : 'HH:mm:ss')}`;
}

export function formatTriggerText(
  mode: DatePickerMode,
  date: Date | DateRange | undefined,
  timeValue: string | undefined,
  showTime: boolean,
  fmt: TimeFormat,
): string {
  if (mode === 'time-only') return timeValue || '';
  if (mode === 'range') {
    const r = date as DateRange | undefined;
    if (!r?.from) return '';
    return `${format(r.from, 'dd/MM/yyyy')} –${r.to ? ` ${format(r.to, 'dd/MM/yyyy')}` : ''}`;
  }
  return date instanceof Date ? formatDateDisplay(date, showTime, fmt) : '';
}

export function getDefaultPresets(mode: DatePickerMode, labels: DatePickerLabels, now = new Date()): DatePreset[] {
  if (mode === 'single') {
    return [
      { label: labels.today, value: now },
      { label: labels.tomorrow, value: addDays(now, 1) },
      { label: labels.next7Days, value: addDays(now, 7) },
      { label: labels.next30Days, value: addDays(now, 30) },
    ];
  }
  if (mode === 'range') {
    const opts = { weekStartsOn: 1 as const };
    const lastMonth = subMonths(now, 1);
    return [
      { label: labels.thisWeek, value: { from: startOfWeek(now, opts), to: endOfWeek(now, opts) } },
      { label: labels.last7Days, value: { from: subDays(now, 6), to: now } },
      { label: labels.last30Days, value: { from: subDays(now, 29), to: now } },
      { label: labels.thisMonth, value: { from: startOfMonth(now), to: endOfMonth(now) } },
      { label: labels.lastMonth, value: { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) } },
      { label: labels.thisYear, value: { from: startOfYear(now), to: endOfYear(now) } },
    ];
  }
  return [];
}
