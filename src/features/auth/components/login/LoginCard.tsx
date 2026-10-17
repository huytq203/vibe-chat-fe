import type { ReactNode } from 'react';

/** Thẻ viền bo chứa các điều khiển của một bước đăng nhập. */
export function LoginCard({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-[440px] animate-in space-y-3.5 rounded-3xl border border-border p-5 text-left fade-in slide-in-from-bottom-2 duration-500 sm:p-6">
      {children}
    </div>
  );
}
