import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface LoginHeadingProps {
  title: ReactNode;
  description?: ReactNode;
  /** Icon động của bước (thư, chờ trình duyệt, xong). */
  icon?: ReactNode;
  /** `hero` cho tiêu đề đầu trang; `step` nhỏ hơn cho các bước sau. */
  size?: 'hero' | 'step';
}

/** Tiêu đề căn giữa phía trên thẻ form. Luôn là h1 duy nhất của trang. */
export function LoginHeading({ title, description, icon, size = 'hero' }: LoginHeadingProps) {
  return (
    <div className="flex max-w-xl animate-in flex-col items-center gap-3 fade-in slide-in-from-bottom-2 duration-500">
      {icon}
      <h1
        className={cn(
          'text-balance font-extrabold leading-[1.08] tracking-tight text-foreground',
          size === 'hero' ? 'text-[34px] sm:text-5xl' : 'text-3xl sm:text-4xl',
        )}
      >
        {title}
      </h1>
      {description && <p className="max-w-md text-balance text-base text-muted-foreground">{description}</p>}
    </div>
  );
}
