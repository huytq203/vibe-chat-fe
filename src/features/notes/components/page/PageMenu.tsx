'use client';

import { Download, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu/DropdownMenu';
import { usePageExport, type ExportKind } from '@/features/notes/hooks/usePageExport';

const EXPORT_LABELS: Record<ExportKind, string> = {
  markdown: 'Xuất Markdown',
  pdf: 'Xuất PDF',
  html: 'Xuất HTML',
};

interface PageMenuProps {
  pageId: string;
  pageTitle: string;
}

export function PageMenu({ pageId, pageTitle }: PageMenuProps) {
  const { pending, exportPage } = usePageExport(pageId, pageTitle);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost" size="icon-sm" aria-label="Tuỳ chọn trang" title="Tuỳ chọn trang"
          >
            <MoreHorizontal aria-hidden="true" className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {(['markdown', 'pdf', 'html'] as const).map((kind) => (
          <DropdownMenuItem
            key={kind}
            disabled={pending !== null}
            onClick={() => void exportPage(kind)}
          >
            <Download aria-hidden="true" />
            {pending === kind ? 'Đang dựng…' : EXPORT_LABELS[kind]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
