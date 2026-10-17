import { tv } from 'tailwind-variants';
import type { ClassNames } from 'react-day-picker';
import type { CalendarSize } from './calendarUtils';

/** Cell classes for the month / year pick grids. */
export const gridCellVariants = tv({
  base: [
    'h-11 min-w-0 whitespace-nowrap rounded-lg px-2 text-sm font-medium tabular-nums text-foreground transition-colors',
    'hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
    'disabled:pointer-events-none disabled:opacity-40',
  ],
  variants: {
    selected: { true: 'bg-primary text-primary-foreground hover:bg-primary' },
    current: { true: 'ring-1 ring-inset ring-primary' },
  },
});

export const headerButtonVariants = tv({
  base: [
    'inline-flex items-center justify-center rounded-lg text-muted-foreground transition-colors',
    'hover:bg-primary/10 hover:text-foreground',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
    'disabled:pointer-events-none disabled:opacity-40',
  ],
  variants: {
    kind: {
      icon: 'size-8',
      title: 'gap-1 px-2.5 py-1.5 text-[15px] font-semibold text-foreground',
    },
  },
});

const cellSize: Record<CalendarSize, { cell: string; text: string }> = {
  sm: { cell: 'size-8', text: 'text-xs' },
  md: { cell: 'size-10', text: 'text-sm' },
  lg: { cell: 'size-12', text: 'text-base' },
};

/** Fixed panel width (7 day cells) so month/year grids keep the same footprint as the day grid. */
export const panelWidth: Record<CalendarSize, string> = {
  sm: 'w-56',
  md: 'w-70',
  lg: 'w-84',
};

const rangeBand = 'bg-primary/10';
const halfBand = (side: 'start' | 'end') =>
  side === 'start'
    ? 'bg-[linear-gradient(to_right,transparent_50%,color-mix(in_oklab,var(--color-primary)_10%,transparent)_50%)]'
    : 'bg-[linear-gradient(to_left,transparent_50%,color-mix(in_oklab,var(--color-primary)_10%,transparent)_50%)]';

/**
 * react-day-picker class names built only from Tailwind utilities, so the
 * library's default stylesheet is never imported and nothing leaks globally.
 */
export function getDayClassNames(size: CalendarSize): Partial<ClassNames> {
  const { cell, text } = cellSize[size];
  return {
    root: 'relative',
    months: 'flex flex-col',
    month: 'flex flex-col gap-1',
    month_grid: 'border-collapse',
    weekdays: '',
    weekday: `${cell} p-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-center align-middle`,
    week: '',
    day: `${cell} relative p-0 text-center align-middle`,
    day_button: [
      cell,
      text,
      'inline-flex items-center justify-center rounded-lg font-medium tabular-nums text-foreground transition-colors',
      'hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary',
    ].join(' '),
    selected: '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button:hover]:bg-primary',
    today: '[&>button]:ring-1 [&>button]:ring-inset [&>button]:ring-primary',
    outside: '[&>button]:text-muted-foreground [&>button]:opacity-50',
    disabled: '[&>button]:pointer-events-none [&>button]:opacity-35',
    hidden: 'invisible',
    range_start: halfBand('start'),
    range_end: halfBand('end'),
    range_middle: `${rangeBand} [&>button]:rounded-none [&>button]:bg-transparent [&>button]:text-foreground`,
  };
}
