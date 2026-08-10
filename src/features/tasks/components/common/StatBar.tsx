import { cn } from '@/lib/utils/cn';

export interface StatBarItem {
  label: string;
  value: number;
  /** Dòng phụ dưới số liệu (vd: "trên 4 dự án"). */
  hint?: string;
  tone?: 'default' | 'success' | 'danger';
}

interface StatBarProps {
  items: StatBarItem[];
  className?: string;
}

/**
 * Dải chỉ số dạng một bảng đồng hồ liền khối, chia ô bằng đường kẻ mảnh —
 * thay cho lưới 4 card rời vốn làm loãng trọng tâm trang.
 */
export function StatBar({ items, className }: StatBarProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-background shadow-micro sm:grid-cols-4',
        className,
      )}
    >
      {items.map((item, index) => (
        <div
          key={item.label}
          className={cn(
            'border-border/60 px-4 py-3.5',
            index % 2 === 0 && 'border-r',
            index < 2 && 'border-b sm:border-b-0',
            'sm:border-r sm:last:border-r-0',
          )}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {item.label}
          </p>
          <p
            className={cn(
              'mt-1 text-[26px] font-extrabold leading-none tracking-tight tabular-nums',
              item.tone === 'danger' && 'text-danger',
              item.tone === 'success' && 'text-success',
              (!item.tone || item.tone === 'default') && 'text-foreground',
            )}
          >
            {item.value}
          </p>
          {item.hint && (
            <p className="mt-1.5 text-[11.5px] leading-snug text-muted-foreground">{item.hint}</p>
          )}
        </div>
      ))}
    </div>
  );
}
