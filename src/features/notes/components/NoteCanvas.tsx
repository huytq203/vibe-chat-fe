'use client';

import { ArrowLeft, FileText, PanelRightClose, PanelRightOpen, PanelLeft } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useCallback, useEffect } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button/Button';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { useAwareness, type CollabPerson } from '@/features/notes/hooks/useAwareness';
import { useCollabDoc, type UseCollabDocResult } from '@/features/notes/hooks/useCollabDoc';
import { usePage } from '@/features/notes/hooks/use-query';
import { recordRecentPage } from '@/features/notes/lib/recent-pages';
import { useNotesUiStore } from '@/features/notes/stores/notes-ui.store';
import { notionKeys } from '@/services/keys';
import { ConnectionIndicator } from './editor/ConnectionIndicator';
import { PresenceBar } from './editor/PresenceBar';
import { FloatingAiButton } from './FloatingAiButton';
import { Breadcrumb } from './page/Breadcrumb';
import { PageIcon } from './page/PageIcon';
import { PageMenu } from './page/PageMenu';

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

  useEffect(() => {
    if (!data) return;
    recordRecentPage({
      id: data.id, workspaceId: data.workspaceId, title: data.title, icon: data.icon,
    });
  }, [data]);

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
    <article className="relative text-foreground [--note-content-gutter:10px]">
      <PageIcon pageId={pageId} icon={data.icon} />
      <LazyNoteEditor
        pageId={pageId}
        collab={collab}
        people={people}
      />
    </article>
  );
}

interface PageTopbarProps {
  collab: UseCollabDocResult;
  onSelectPage: (id: string) => void;
  pageId: string;
  pageTitle?: string;
  people: CollabPerson[];
  onBack: () => void;
}

function PageTopbar({ collab, onSelectPage, pageId, pageTitle, people, onBack }: PageTopbarProps) {
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
        <div className="hidden sm:block">
          <PresenceBar people={people} />
        </div>
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

interface NoteCanvasProps {
  pageId: string | null;
  onSelectPage: (id: string) => void;
  onBack?: () => void;
}

export function NoteCanvas({ pageId, onSelectPage, onBack = () => undefined }: NoteCanvasProps) {
  const queryClient = useQueryClient();
  const pageQuery = usePage(pageId ?? '');
  const handleStateless = useCallback((payload: string) => {
    if (!pageId) return;
    try {
      const message: unknown = JSON.parse(payload);
      if (
        typeof message !== 'object' || message === null || !('type' in message)
        || message.type !== 'comments-changed' || !('pageId' in message)
        || message.pageId !== pageId
      ) return;
      void queryClient.invalidateQueries({ queryKey: notionKeys.comments(pageId) });
    } catch {
      // Bỏ qua payload mạng hỏng để editor tiếp tục hoạt động.
    }
  }, [pageId, queryClient]);
  const collab = useCollabDoc(pageId ?? '', {
    enabled: Boolean(pageId && pageQuery.data), onStateless: handleStateless,
  });
  const people = useAwareness(collab.provider);
  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-background md:rounded-2xl md:border md:shadow-subtle">
      {pageId ? (
        <PageTopbar
          collab={collab} onSelectPage={onSelectPage} pageId={pageId}
          pageTitle={pageQuery.data?.title}
          people={people} onBack={onBack}
        />
      ) : (
        <div
          aria-hidden="true"
          className="sticky top-0 z-10 h-14 border-b border-border bg-background"
        />
      )}
      <div className="mx-auto w-full max-w-[45rem] px-4 pb-[calc(var(--safe-bottom)+6rem)] pt-10 sm:px-6 sm:pt-14 md:px-6 md:pb-32 md:pt-16">
        {pageId ? (
          <SelectedPage
            collab={collab} pageId={pageId} pageQuery={pageQuery} people={people}
          />
        ) : (
          <EmptyState
            icon={<PanelLeft aria-hidden="true" />}
            title="Chọn một trang ở bên trái"
            hint="Nội dung trang sẽ xuất hiện tại đây."
          />
        )}
      </div>
      <FloatingAiButton />
    </main>
  );
}
