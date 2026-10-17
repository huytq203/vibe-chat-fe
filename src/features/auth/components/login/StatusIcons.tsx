import { cn } from '@/lib/utils/cn';

interface StatusIconProps {
  className?: string;
}

// Nét vẽ dùng pathLength=1 để một cặp dasharray/dashoffset = 1 là đủ, không phụ thuộc độ dài thật.
const DRAW_BASE = 'fill-none [stroke-dasharray:1] [stroke-dashoffset:1] motion-reduce:animate-none motion-reduce:[stroke-dashoffset:0]';

/** Đăng nhập xong: vòng tròn và dấu tích tự vẽ, kèm một vòng sóng lan ra. */
export function DoneIcon({ className }: StatusIconProps) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="Thành công" className={cn('size-24 overflow-visible', className)}>
      <circle cx="32" cy="32" r="28" className="animate-pop-in fill-success/15 [transform-box:fill-box] [transform-origin:center] motion-reduce:animate-none" />
      <circle cx="32" cy="32" r="28" strokeWidth="2" className="animate-ripple fill-none stroke-success opacity-0 [transform-box:fill-box] [transform-origin:center] motion-reduce:animate-none" />
      <circle cx="32" cy="32" r="28" pathLength={1} strokeWidth="3" strokeLinecap="round" transform="rotate(-90 32 32)" className={cn(DRAW_BASE, 'animate-draw stroke-success')} />
      <path d="M20 33l8 8 17-18" pathLength={1} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" className={cn(DRAW_BASE, 'animate-draw-late stroke-success')} />
    </svg>
  );
}

/** Đã gửi mã: nắp thư mở ra, lá thư trượt lên. */
export function MailIcon({ className }: StatusIconProps) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="Email đã gửi" className={cn('size-16 overflow-visible', className)}>
      <path d="M8 26l24-17 24 17z" strokeWidth="2.5" strokeLinejoin="round" className="animate-fade-in-late fill-secondary stroke-primary opacity-0 motion-reduce:animate-none motion-reduce:opacity-100" />
      <g className="animate-envelope-rise motion-reduce:animate-none motion-reduce:-translate-y-5">
        <rect x="17" y="30" width="30" height="24" rx="4" strokeWidth="2.5" className="fill-background stroke-primary" />
        <path d="M23 38h18M23 44h12" strokeWidth="2.5" strokeLinecap="round" className="stroke-primary/55" />
      </g>
      <path d="M8 26h48v26a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4z" strokeWidth="2.5" strokeLinejoin="round" className="fill-secondary stroke-primary" />
      <path d="M8 26l24 17 24-17z" strokeWidth="2.5" strokeLinejoin="round" className="animate-flap-out fill-secondary stroke-primary [transform-box:view-box] [transform-origin:32px_26px] motion-reduce:animate-none motion-reduce:opacity-0" />
    </svg>
  );
}

/** Đang chờ trình duyệt: vòng quay quanh biểu tượng cửa sổ. */
export function WaitIcon({ className }: StatusIconProps) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="Đang chờ trình duyệt" className={cn('size-16 overflow-visible', className)}>
      <circle cx="32" cy="32" r="28" strokeWidth="4" className="fill-none stroke-secondary" />
      <circle cx="32" cy="32" r="28" strokeWidth="4" strokeLinecap="round" className="animate-spin fill-none stroke-primary [stroke-dasharray:44_132] [transform-box:view-box] [transform-origin:32px_32px] motion-reduce:animate-none" />
      <rect x="19" y="21" width="26" height="22" rx="4" strokeWidth="2.5" className="fill-none stroke-primary" />
      <path d="M19 28h26" strokeWidth="2.5" strokeLinecap="round" className="stroke-primary" />
    </svg>
  );
}
