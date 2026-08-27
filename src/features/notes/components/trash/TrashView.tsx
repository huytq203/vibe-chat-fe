'use client';

import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { ScrollArea } from '@/components/ui/scroll-area/ScrollArea';
import { TrashList } from './TrashList';

interface TrashViewProps {
  workspaceId: string;
  onBack?: () => void;
}

export function TrashView({ workspaceId, onBack }: TrashViewProps) {
  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background md:rounded-2xl md:border md:shadow-subtle">
      <header className="flex min-h-14 shrink-0 items-center gap-2 border-b border-border px-2 max-md:pt-[var(--safe-top)] md:px-4">
        {onBack && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-11 rounded-xl md:hidden"
            aria-label="Quay lại danh sách trang"
            title="Quay lại danh sách trang"
            onClick={onBack}
          >
            <ArrowLeft aria-hidden="true" className="size-5" />
          </Button>
        )}
        <Trash2 aria-hidden="true" className="size-4 text-muted-foreground" />
        <h1 className="text-sm font-semibold text-foreground">Thùng rác</h1>
      </header>
      <ScrollArea className="min-h-0 min-w-0 flex-1 overflow-x-hidden pb-[var(--safe-bottom)] md:pb-0">
        <TrashList workspaceId={workspaceId} />
      </ScrollArea>
    </main>
  );
}
