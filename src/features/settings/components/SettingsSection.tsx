'use client';

import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

/** Khối nội dung 1 mục trong tab settings: tiêu đề + mô tả + body. */
export function SettingsSection({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-6">
      <h3 className="text-[14px] font-bold text-foreground">{title}</h3>
      {desc && <p className="mt-0.5 mb-3 text-[12px] text-muted-foreground">{desc}</p>}
      {!desc && <div className="mb-3" />}
      {children}
    </section>
  );
}

/** Placeholder cho tab chưa có hạ tầng BE/FE. */
export function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
      <Sparkles className="h-7 w-7 opacity-60" />
      <p className="text-[13px] font-semibold text-foreground">{label}</p>
      <p className="text-[12px]">Tính năng đang được phát triển — sẽ sớm ra mắt.</p>
    </div>
  );
}
