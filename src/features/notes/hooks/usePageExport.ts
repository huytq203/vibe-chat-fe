'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api/error-message';
import { exportApi } from '@/services/notion-export.api';

export type ExportKind = 'markdown' | 'pdf' | 'html';

function slugForFilename(title: string): string {
  const slug = title.trim().toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'khong-co-tieu-de';
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function runExport(kind: ExportKind, pageId: string, filenameBase: string) {
  if (kind === 'markdown') {
    const markdown = await exportApi.markdown(pageId);
    downloadBlob(new Blob([markdown], { type: 'text/markdown' }), `${filenameBase}.md`);
    return;
  }
  if (kind === 'html') {
    const html = await exportApi.html(pageId);
    downloadBlob(new Blob([html], { type: 'text/html' }), `${filenameBase}.html`);
    return;
  }
  const pdf = await exportApi.pdf(pageId);
  downloadBlob(pdf, `${filenameBase}.pdf`);
}

/** Logic xuất trang (M6-T5) tách khỏi PageMenu để test trực tiếp, không phải
 * click xuyên qua DropdownMenu (Base UI) trong jsdom. */
export function usePageExport(pageId: string, pageTitle: string) {
  const [pending, setPending] = useState<ExportKind | null>(null);

  async function exportPage(kind: ExportKind) {
    if (pending) return;
    setPending(kind);
    try {
      await runExport(kind, pageId, slugForFilename(pageTitle));
      toast.success('Đã xuất trang');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Xuất trang thất bại'));
    } finally {
      setPending(null);
    }
  }

  return { pending, exportPage };
}
