'use client';

import { cn } from '@/lib/utils/cn';

interface TypingDotsProps {
  /** Nhãn cạnh chấm. Chuỗi rỗng → chỉ đọc cho screen reader, không hiện chữ. */
  label?: string;
  className?: string;
}

/**
 * Ba chấm "đang soạn" dùng chung cho chat người-với-người và chat AI.
 * Tách ra để hai màn không lệch nhịp/độ trễ mỗi lần một bên được chỉnh.
 */
const DOT_CLASS =
  'h-1.5 w-1.5 animate-typing-dot rounded-full bg-current motion-reduce:animate-none motion-reduce:opacity-60';

export function TypingDots({ label = 'đang nhập…', className }: TypingDotsProps) {
  return (
    <span role="status" className={cn('flex items-center gap-1', className)}>
      <span aria-hidden="true" className={cn(DOT_CLASS, '[animation-delay:0ms]')} />
      <span aria-hidden="true" className={cn(DOT_CLASS, '[animation-delay:150ms]')} />
      <span aria-hidden="true" className={cn(DOT_CLASS, '[animation-delay:300ms]')} />
      <span className={label ? 'ml-1 text-[11px]' : 'sr-only'}>{label || 'đang nhập…'}</span>
    </span>
  );
}
