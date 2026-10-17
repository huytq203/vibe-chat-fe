'use client';
import * as React from 'react';
import type { DayPickerProps } from 'react-day-picker';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { MonthGrid, YearGrid } from './CalendarGrids';
import { getDayClassNames, headerButtonVariants, panelWidth } from './calendarStyles';
import {
  clampYear,
  getIntlTag,
  getMonthLabel,
  shiftMonth,
  YEARS_PER_BLOCK,
  type CalendarLocaleKey,
  type CalendarSize,
} from './calendarUtils';

type View = 'day' | 'month' | 'year';

/** Props every day grid receives from the panel; spread them into a DayPicker. */
export type SharedDayProps = Pick<
  DayPickerProps,
  'month' | 'onMonthChange' | 'hideNavigation' | 'classNames' | 'components' | 'locale' | 'showOutsideDays' | 'startMonth' | 'endMonth'
>;

export interface CalendarPanelProps {
  month: Date;
  onMonthChange: (month: Date) => void;
  /** Renders the day grid (a DayPicker) for the current month. */
  renderDays: (shared: SharedDayProps) => React.ReactNode;
  locale: CalendarLocaleKey;
  dayPickerLocale: DayPickerProps['locale'];
  fromYear: number;
  toYear: number;
  size?: CalendarSize;
  showOutsideDays?: boolean;
  className?: string;
}

const NoCaption = () => <></>;

/**
 * One calendar month with a clickable month/year header that drills into
 * 12-month and 12-year pick grids. Fully styled with Tailwind utilities.
 */
const CalendarPanel = React.forwardRef<HTMLDivElement, CalendarPanelProps>(
  ({ month, onMonthChange, renderDays, locale, dayPickerLocale, fromYear, toYear, size = 'md', showOutsideDays = true, className }, ref) => {
    const [view, setView] = React.useState<View>('day');
    const [yearStart, setYearStart] = React.useState(month.getFullYear() - 4);
    const intlTag = getIntlTag(locale);
    const year = month.getFullYear();
    const classNames = React.useMemo(() => getDayClassNames(size), [size]);

    const move = (dir: 1 | -1) => {
      if (view === 'year') setYearStart((y) => y + dir * YEARS_PER_BLOCK);
      else onMonthChange(shiftMonth(month, view === 'month' ? dir * 12 : dir));
    };
    const canMove = (dir: 1 | -1) => {
      if (view === 'year') {
        const next = yearStart + dir * YEARS_PER_BLOCK;
        return dir === 1 ? next <= toYear : next + YEARS_PER_BLOCK - 1 >= fromYear;
      }
      const target = shiftMonth(month, view === 'month' ? dir * 12 : dir).getFullYear();
      return target >= fromYear && target <= toYear;
    };

    const prevLabel = view === 'year' ? 'Previous 12 years' : view === 'month' ? 'Previous year' : 'Previous month';
    const nextLabel = view === 'year' ? 'Next 12 years' : view === 'month' ? 'Next year' : 'Next month';
    const toggle = (target: View) => {
      if (target === 'year') setYearStart(year - 4);
      setView((v) => (v === target ? 'day' : target));
    };

    return (
      <div ref={ref} className={className ?? 'p-3.5'} data-calendar-view={view}>
        <div className={panelWidth[size]}>
        <div className="mb-2.5 flex items-center gap-1">
          <button type="button" aria-label={prevLabel} disabled={!canMove(-1)} onClick={() => move(-1)} className={headerButtonVariants({ kind: 'icon' })}>
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <div className="flex flex-1 items-center justify-center gap-0.5">
            {view === 'day' && (
              <button type="button" aria-label="Choose month" aria-expanded={false} onClick={() => toggle('month')} className={headerButtonVariants({ kind: 'title' })}>
                {getMonthLabel(intlTag, month.getMonth())}
                <ChevronDown className="size-3 opacity-60" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              aria-label="Choose year"
              aria-expanded={view === 'year'}
              onClick={() => (view === 'year' ? setView('day') : toggle('year'))}
              className={headerButtonVariants({ kind: 'title' })}
            >
              {view === 'year' ? `${yearStart} – ${yearStart + YEARS_PER_BLOCK - 1}` : year}
              <ChevronDown className="size-3 opacity-60" aria-hidden="true" />
            </button>
          </div>
          <button type="button" aria-label={nextLabel} disabled={!canMove(1)} onClick={() => move(1)} className={headerButtonVariants({ kind: 'icon' })}>
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>

        {view === 'day' && renderDays({
          month,
          onMonthChange,
          hideNavigation: true,
          classNames,
          components: { MonthCaption: NoCaption },
          locale: dayPickerLocale,
          showOutsideDays,
          startMonth: new Date(fromYear, 0),
          endMonth: new Date(toYear, 11),
        })}
        {view === 'month' && (
          <MonthGrid
            year={year}
            selectedMonth={month.getMonth()}
            intlTag={intlTag}
            onPick={(m) => { onMonthChange(new Date(year, m, 1)); setView('day'); }}
          />
        )}
        {view === 'year' && (
          <YearGrid
            startYear={yearStart}
            selectedYear={year}
            fromYear={fromYear}
            toYear={toYear}
            onPick={(y) => { onMonthChange(new Date(clampYear(y, fromYear, toYear), month.getMonth(), 1)); setView('month'); }}
          />
        )}
        </div>
      </div>
    );
  },
);
CalendarPanel.displayName = 'CalendarPanel';

export { CalendarPanel };
