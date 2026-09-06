import type { ClassNames } from 'react-day-picker';

/**
 * Theme dùng chung cho mọi DayPicker (Calendar, DatePicker) — thay thế hoàn toàn
 * stylesheet mặc định của react-day-picker để lịch bám token của dự án
 * (background/border/primary/muted) và tự chạy đúng ở dark mode.
 *
 * Cấu trúc DOM v10: table > thead(tr>th) + tbody(tr>td>button).
 * `selected/today/outside/...` gắn trên <td> nên style nút con qua `[&>button]:`.
 */
const NAV_BUTTON =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-40';

const DAY_BUTTON =
  'flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium tabular-nums text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

export const dayPickerClassNames: Partial<ClassNames> = {
  root: 'select-none text-foreground',
  months: 'relative flex flex-col gap-4 sm:flex-row',
  month: 'flex flex-col gap-3',

  nav: 'absolute inset-x-0 top-0 z-10 flex items-center justify-between',
  button_previous: NAV_BUTTON,
  button_next: NAV_BUTTON,
  chevron: 'h-4 w-4 fill-current',

  month_caption: 'flex h-8 items-center justify-center px-10',
  caption_label: 'inline-flex items-center gap-1 text-sm font-semibold capitalize text-foreground',
  dropdowns: 'flex items-center gap-1.5',
  dropdown_root:
    'relative inline-flex items-center rounded-lg border border-border bg-background px-2.5 py-1 transition-colors hover:border-primary hover:bg-muted has-[select:focus-visible]:border-primary',
  dropdown: 'absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none opacity-0',

  month_grid: 'border-collapse',
  weekdays: '',
  weekday:
    'h-8 w-9 p-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground',
  weeks: '',
  week: '',
  day: 'h-9 w-9 p-0 text-center align-middle',
  day_button: DAY_BUTTON,

  selected:
    '[&>button]:bg-primary [&>button]:font-semibold [&>button]:text-primary-foreground [&>button]:hover:bg-primary',
  today: '[&>button]:font-bold [&>button]:ring-1 [&>button]:ring-inset [&>button]:ring-primary/50',
  outside: '[&>button]:text-muted-foreground/45',
  disabled: 'pointer-events-none [&>button]:text-muted-foreground/35',
  hidden: 'invisible',

  range_start: 'rounded-l-lg bg-primary/12 [&>button]:bg-primary [&>button]:text-primary-foreground',
  range_middle:
    'bg-primary/12 [&>button]:bg-transparent [&>button]:text-foreground [&>button]:hover:bg-primary/20',
  range_end: 'rounded-r-lg bg-primary/12 [&>button]:bg-primary [&>button]:text-primary-foreground',

  week_number: 'h-9 w-9 text-xs font-medium text-muted-foreground/70',
  week_number_header: 'h-8 w-9',
  footer: 'pt-2 text-xs text-muted-foreground',
};
