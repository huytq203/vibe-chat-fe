'use client';

import { ArrowLeft, PanelRightClose, PanelRightOpen } from 'lucide-react';

import { Button } from '@/components/ui/button/Button';
import type { CollabPerson } from '@/features/notes/hooks/useAwareness';
import type { UseCollabDocResult } from '@/features/notes/hooks/useCollabDoc';
import { useNotesUiStore } from '@/features/notes/stores/notes-ui.store';

import { ConnectionIndicator } from './editor/ConnectionIndicator';
import { PresenceBar } from './editor/PresenceBar';
import { Breadcrumb } from './page/Breadcrumb';
import { PageMenu } from './page/PageMenu';

interface PageTopbarProps {
  collab: UseCollabDocResult;
  onSelectPage: (id: string) => void;
  pageId: string;
  pageTitle?: string;
  people: CollabPerson[];
  onBack: () => void;
}

export function PageTopbar({ collab, onSelectPage, pageId, pageTitle, people, onBack }: PageTopbarProps) {
  const isPanelOpen = useNotesUiStore((state) => state.isSidePanelOpen);
  const toggleSidePanel = useNotesUiStore((state) => state.toggleSidePanel);

  return (
    <header className="sticky top-0 z-10 flex min-h-14 min-w-0 shrink-0 items-center gap-1 border-b border-border bg-background px-2 max-md:pt-[var(--safe-top)] md:gap-2 md:px-3">
      <Button
        variant="ghost"
        size="icon-sm"
        className="size-11 shrink-0 rounded-xl text-muted-foreground md:hidden"
        aria-label="Quay lại danh sách trang"
        title="Quay lại danh sách trang"
        onClick={onBack}
      >
        <ArrowLeft aria-hidden="true" className="size-5" />
      </Button>
      <div className="min-w-0 flex-1">
        <Breadcrumb pageId={pageId} onSelectPage={onSelectPage} />
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <div className="hidden sm:block"><PresenceBar people={people} /></div>
        <ConnectionIndicator
          error={collab.error}
          isLocalReady={collab.isLocalReady}
          isSynced={collab.isSynced}
          status={collab.status}
        />
        {pageTitle !== undefined && <PageMenu pageId={pageId} pageTitle={pageTitle} />}
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-9 rounded-xl"
          aria-controls="notes-side-panel"
          aria-expanded={isPanelOpen}
          aria-label={isPanelOpen ? 'Đóng bảng bên' : 'Mở bảng bên'}
          title={isPanelOpen ? 'Đóng bảng bên' : 'Mở bảng bên'}
          onClick={toggleSidePanel}
        >
          {isPanelOpen ? (
            <PanelRightClose aria-hidden="true" className="size-4" />
          ) : (
            <PanelRightOpen aria-hidden="true" className="size-4" />
          )}
        </Button>
      </div>
    </header>
  );
}
