import type { ReactNode } from 'react';

export function InvitePhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-[#0d0a14] p-4">
      <div className="pointer-events-none fixed right-[-120px] top-[-150px] h-[500px] w-[500px] rounded-full bg-primary/[0.07] blur-[90px]" />
      <div className="pointer-events-none fixed bottom-[-100px] left-[-100px] h-[380px] w-[380px] rounded-full bg-destructive/[0.03] blur-[90px]" />
      <div className="relative z-[1] flex h-[calc(100vh-32px)] max-h-[820px] w-full max-w-[420px] flex-col overflow-hidden rounded-3xl border border-border bg-muted shadow-[0_32px_80px_rgba(0,0,0,0.7)]">
        {children}
      </div>
    </div>
  );
}
