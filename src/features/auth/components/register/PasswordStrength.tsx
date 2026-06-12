'use client';
import { cn } from '@/lib/utils/cn';

/** Độ mạnh 0–4: độ dài ≥8, có chữ hoa, có số, có ký tự đặc biệt. */
export function passwordStrength(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

const LABELS = ['Rất yếu', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'] as const;
const BAR_COLORS = ['bg-danger', 'bg-danger', 'bg-warning', 'bg-info', 'bg-success'] as const;
const TEXT_COLORS = [
  'text-danger',
  'text-danger',
  'text-warning',
  'text-info',
  'text-success',
] as const;

type PasswordStrengthProps = { password: string };

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const s = passwordStrength(password);
  return (
    <div>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-300',
              i <= s && password.length > 0 ? BAR_COLORS[s] : 'bg-border',
            )}
          />
        ))}
      </div>
      {password.length > 0 && (
        <p className={cn('mt-1 text-xs', TEXT_COLORS[s])}>{LABELS[s]}</p>
      )}
    </div>
  );
}
