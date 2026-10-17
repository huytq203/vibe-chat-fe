'use client';
import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { gridCellVariants } from './calendarStyles';
import { getMonthLabel, YEARS_PER_BLOCK } from './calendarUtils';

interface MonthGridProps {
  /** Year the grid is showing. */
  year: number;
  /** Currently selected month index (0-11) for this year, if any. */
  selectedMonth?: number;
  intlTag: string;
  onPick: (month: number) => void;
}

/** 12-month pick grid. */
export const MonthGrid: React.FC<MonthGridProps> = ({ year, selectedMonth, intlTag, onPick }) => {
  const today = new Date();
  return (
    <div className="grid grid-cols-3 gap-1.5 pt-1" role="group" aria-label={String(year)}>
      {Array.from({ length: 12 }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onPick(i)}
          aria-pressed={selectedMonth === i}
          className={gridCellVariants({
            selected: selectedMonth === i,
            current: selectedMonth !== i && year === today.getFullYear() && i === today.getMonth(),
          })}
        >
          {getMonthLabel(intlTag, i)}
        </button>
      ))}
    </div>
  );
};
MonthGrid.displayName = 'MonthGrid';

interface YearGridProps {
  /** First year of the 12-year block. */
  startYear: number;
  selectedYear: number;
  fromYear: number;
  toYear: number;
  onPick: (year: number) => void;
  className?: string;
}

/** 12-year pick grid. */
export const YearGrid: React.FC<YearGridProps> = ({ startYear, selectedYear, fromYear, toYear, onPick, className }) => {
  const currentYear = new Date().getFullYear();
  return (
    <div className={cn('grid grid-cols-3 gap-1.5 pt-1', className)} role="group" aria-label={`${startYear} – ${startYear + YEARS_PER_BLOCK - 1}`}>
      {Array.from({ length: YEARS_PER_BLOCK }, (_, i) => {
        const y = startYear + i;
        return (
          <button
            key={y}
            type="button"
            disabled={y < fromYear || y > toYear}
            onClick={() => onPick(y)}
            aria-pressed={y === selectedYear}
            className={gridCellVariants({ selected: y === selectedYear, current: y !== selectedYear && y === currentYear })}
          >
            {y}
          </button>
        );
      })}
    </div>
  );
};
YearGrid.displayName = 'YearGrid';
