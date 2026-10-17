'use client';

import type { z } from 'zod';

import { NoteHtmlFrame } from '@/features/notes/components/shared/NoteHtmlFrame';
import type { publicPageSchema } from '@/features/notes/schemas';

type PublicPage = z.infer<typeof publicPageSchema>;

export function PublicPageBody({ page }: { page: PublicPage }) {
  if (!page.html.trim()) {
    return <p className="py-8 text-sm text-muted-foreground">Trang này chưa có nội dung.</p>;
  }

  return (
    <div className="pt-8 md:pt-10">
      <NoteHtmlFrame
        html={page.html}
        title={`Nội dung trang ${page.title || 'không có tiêu đề'}`}
      />
    </div>
  );
}
