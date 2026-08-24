'use client';

import { FileText, PanelRightClose, PanelRightOpen, PanelLeft } from 'lucide-react';
import dynamic from 'next/dynamic';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button/Button';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { useAwareness, type CollabPerson } from '@/features/notes/hooks/useAwareness';
import { useCollabDoc, type UseCollabDocResult } from '@/features/notes/hooks/useCollabDoc';
import { usePage } from '@/features/notes/hooks/use-query';
import { useNotesUiStore } from '@/features/notes/stores/notes-ui.store';
import { ConnectionIndicator } from './editor/ConnectionIndicator';
import { PresenceBar } from './editor/PresenceBar';
import { Breadcrumb } from './page/Breadcrumb';
import { PageIcon } from './page/PageIcon';

const LazyNoteEditor = dynamic(
  () => import('./editor/NoteEditor').then((module) => module.NoteEditor),
  { loading: () => <EditorLoadingSkeleton />, ssr: false },
);

export function EditorLoadingSkeleton() {
  return (
    <div className="space-y-4" data-testid="note-editor-chunk-loading">
      <Skeleton rounded="sm" className="h-9 w-full" />
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} rounded="sm" className="h-6 w-full" />
      ))}
    </div>
  );
}

interface SelectedPageProps {
  collab: UseCollabDocResult;
  pageId: string;
  pageQuery: ReturnType<typeof usePage>;
  people: CollabPerson[];
}

function SelectedPage({ collab, pageId, pageQuery, people }: SelectedPageProps) {
  const { data, isLoading, isError, refetch } = pageQuery;

  if (isLoading) return <EditorLoadingSkeleton />;
  if (isError) return <ErrorState message="Không tải được trang" onRetry={refetch} />;
  if (!data) {
    return (
      <EmptyState
        icon={<FileText aria-hidden="true" />}
        title="Không tìm thấy trang"
        hint="Hãy chọn một trang khác ở bên trái."
      />
    );
  }

  // Ảnh bìa: chờ luồng tải tệp ở M6-T3.
  return (
    <article className="relative text-foreground">
      <PageIcon pageId={pageId} icon={data.icon} />
      <LazyNoteEditor pageId={pageId} collab={collab} people={people} />
    </article>
  );
}

interface PageTopbarProps {
  collab: UseCollabDocResult;
  onSelectPage: (id: string) => void;
  pageId: string;
  people: CollabPerson[];
}

function PageTopbar({ collab, onSelectPage, pageId, people }: PageTopbarProps) {
  const isPanelOpen = useNotesUiStore((state) => state.isSidePanelOpen);
  const toggleSidePanel = useNotesUiStore((state) => state.toggleSidePanel);

  return (
    <div className="flex h-[44px] min-w-0 items-center">
      <div className="min-w-0 flex-1">
        <Breadcrumb pageId={pageId} onSelectPage={onSelectPage} />
      </div>
      <div className="flex shrink-0 items-center gap-3 pe-6">
        <PresenceBar people={people} />
        <ConnectionIndicator
          error={collab.error}
          isSynced={collab.isSynced}
          status={collab.status}
        />
        <Button
          variant="ghost"
          size="icon-sm"
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
    </div>
  );
}

interface NoteCanvasProps {
  pageId: string | null;
  onSelectPage: (id: string) => void;
}

export function NoteCanvas({ pageId, onSelectPage }: NoteCanvasProps) {
  const pageQuery = usePage(pageId ?? '');
  const collab = useCollabDoc(pageId ?? '', {
    enabled: Boolean(pageId && pageQuery.data),
  });
  const people = useAwareness(collab.provider);

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-background">
      {pageId ? (
        <PageTopbar
          collab={collab}
          onSelectPage={onSelectPage}
          pageId={pageId}
          people={people}
        />
      ) : (
        <div aria-hidden="true" className="h-[44px]" />
      )}
      <div className="mx-auto w-full max-w-[45rem] px-6 pt-24">
        {pageId ? (
          <SelectedPage
            collab={collab}
            pageId={pageId}
            pageQuery={pageQuery}
            people={people}
          />
        ) : (
          <EmptyState
            icon={<PanelLeft aria-hidden="true" />}
            title="Chọn một trang ở bên trái"
            hint="Nội dung trang sẽ xuất hiện tại đây."
          />
        )}
      </div>
    </main>
  );
}
