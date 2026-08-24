'use client';

import { useCallback, useEffect, type ReactNode } from 'react';
import { FileText, PanelLeft } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { useAwareness, type CollabPerson } from '@/features/notes/hooks/useAwareness';
import { useCollabDoc, type UseCollabDocResult } from '@/features/notes/hooks/useCollabDoc';
import { usePage, useWorkspaces } from '@/features/notes/hooks/use-query';
import { useNotesUiStore } from '@/features/notes/stores/notes-ui.store';
import { ConnectionIndicator } from './editor/ConnectionIndicator';
import { PresenceBar } from './editor/PresenceBar';
import { Breadcrumb } from './page/Breadcrumb';
import { PageIcon } from './page/PageIcon';
import { FavoriteList } from './sidebar/FavoriteList';
import { PageTree } from './sidebar/PageTree';
import { WorkspaceSwitcher } from './sidebar/WorkspaceSwitcher';

const LazyNoteEditor = dynamic(
  () => import('./editor/NoteEditor').then((module) => module.NoteEditor),
  {
    loading: () => <EditorLoadingSkeleton />,
    ssr: false,
  },
);

interface NotesFrameProps {
  sidebar: ReactNode;
  canvas: ReactNode;
  topbar?: ReactNode;
}

function NotesFrame({ sidebar, canvas, topbar }: NotesFrameProps) {
  return (
    <div className="flex h-full min-w-0 flex-1 overflow-hidden bg-background">
      <aside className="w-[260px] shrink-0 overflow-y-auto bg-sidebar py-2">{sidebar}</aside>
      <main className="min-w-0 flex-1 overflow-y-auto bg-background">
        {topbar ?? <div aria-hidden="true" className="h-[44px]" />}
        <div className="mx-auto w-full max-w-[45rem] px-6 pt-24">{canvas}</div>
      </main>
    </div>
  );
}

function NotesLayoutSkeleton() {
  return (
    <NotesFrame
      sidebar={
        <div className="space-y-px px-2">
          <Skeleton rounded="sm" className="mb-4 h-10 w-full" />
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} rounded="sm" className="h-[30px] w-full" />
          ))}
        </div>
      }
      canvas={
        <div data-testid="notes-layout-loading" className="space-y-6">
          <Skeleton rounded="sm" className="h-11 w-2/3" />
          <Skeleton rounded="sm" className="h-20 w-full" />
        </div>
      }
    />
  );
}

function EditorLoadingSkeleton() {
  return (
    <div className="space-y-4" data-testid="note-editor-chunk-loading">
      <Skeleton rounded="sm" className="h-9 w-full" />
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} rounded="sm" className="h-6 w-full" />
      ))}
    </div>
  );
}

interface SelectedPageCanvasProps {
  collab: UseCollabDocResult;
  pageId: string;
  pageQuery: ReturnType<typeof usePage>;
  people: CollabPerson[];
}

function SelectedPageCanvas({
  collab,
  pageId,
  pageQuery,
  people,
}: SelectedPageCanvasProps) {
  const { data, isLoading, isError, refetch } = pageQuery;

  if (isLoading) {
    return <EditorLoadingSkeleton />;
  }
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

  // Ảnh bìa: chờ luồng tải tệp ở M6-T3
  return (
    <article className="relative text-foreground">
      <PageIcon pageId={pageId} icon={data.icon} />
      <LazyNoteEditor pageId={pageId} collab={collab} people={people} />
    </article>
  );
}

interface PageCanvasProps {
  collab: UseCollabDocResult;
  pageId: string | null;
  pageQuery: ReturnType<typeof usePage>;
  people: CollabPerson[];
}

function PageCanvas({ collab, pageId, pageQuery, people }: PageCanvasProps) {
  if (pageId) {
    return (
      <SelectedPageCanvas
        collab={collab}
        pageId={pageId}
        pageQuery={pageQuery}
        people={people}
      />
    );
  }

  return (
    <EmptyState
      icon={<PanelLeft aria-hidden="true" />}
      title="Chọn một trang ở bên trái"
      hint="Nội dung trang sẽ xuất hiện tại đây."
    />
  );
}

interface PageTopbarProps {
  collab: UseCollabDocResult;
  onSelectPage: (id: string) => void;
  pageId: string;
  people: CollabPerson[];
}

function PageTopbar({ collab, onSelectPage, pageId, people }: PageTopbarProps) {
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
      </div>
    </div>
  );
}

function useNotesNavigation() {
  const params = useParams<{ workspaceId?: string; pageId?: string }>();
  const router = useRouter();
  const routeWorkspaceId = params.workspaceId ?? null;
  const storedWorkspaceId = useNotesUiStore((state) => state.activeWorkspaceId);
  const setActiveWorkspace = useNotesUiStore((state) => state.setActiveWorkspace);
  const workspacesQuery = useWorkspaces();

  useEffect(() => {
    if (routeWorkspaceId) {
      if (storedWorkspaceId !== routeWorkspaceId) setActiveWorkspace(routeWorkspaceId);
      return;
    }
    const firstWorkspace = workspacesQuery.data?.[0];
    if (!firstWorkspace) return;
    setActiveWorkspace(firstWorkspace.id);
    router.replace(`/notes/${firstWorkspace.id}`);
  }, [routeWorkspaceId, router, setActiveWorkspace, storedWorkspaceId, workspacesQuery.data]);

  const handleSelectWorkspace = useCallback((id: string) => {
    setActiveWorkspace(id);
    router.push(`/notes/${id}`);
  }, [router, setActiveWorkspace]);
  const handleSelectPage = useCallback((id: string) => {
    if (routeWorkspaceId) router.push(`/notes/${routeWorkspaceId}/${id}`);
  }, [routeWorkspaceId, router]);

  return {
    activeWorkspaceId: routeWorkspaceId ?? storedWorkspaceId,
    handleSelectPage,
    handleSelectWorkspace,
    pageId: params.pageId ?? null,
    routeWorkspaceId,
    workspacesQuery,
  };
}

interface ActiveNotesFrameProps {
  workspaceId: string;
  pageId: string | null;
  workspaceSwitcher: ReactNode;
  onSelectPage: (id: string) => void;
}

function ActiveNotesFrame({ workspaceId, pageId, workspaceSwitcher,
  onSelectPage,
}: ActiveNotesFrameProps) {
  const pageQuery = usePage(pageId ?? '');
  const collab = useCollabDoc(pageId ?? '', {
    enabled: Boolean(pageId && pageQuery.data),
  });
  const people = useAwareness(collab.provider);
  const topbar = pageId ? (
    <PageTopbar
      collab={collab}
      onSelectPage={onSelectPage}
      pageId={pageId}
      people={people}
    />
  ) : undefined;
  return (
    <NotesFrame
      sidebar={
        <div className="space-y-4">
          {workspaceSwitcher}
          <div>
            <FavoriteList onSelectPage={onSelectPage} />
            <PageTree
              workspaceId={workspaceId} activePageId={pageId}
              onSelectPage={onSelectPage}
            />
          </div>
        </div>
      }
      canvas={(
        <PageCanvas
          collab={collab}
          pageId={pageId}
          pageQuery={pageQuery}
          people={people}
        />
      )}
      topbar={topbar}
    />
  );
}

export function NotesLayout() {
  const navigation = useNotesNavigation();
  const { data: workspaces, isLoading, isError, refetch } = navigation.workspacesQuery;

  if (isLoading || (!navigation.routeWorkspaceId && workspaces && workspaces.length > 0)) {
    return <NotesLayoutSkeleton />;
  }

  const workspaceSwitcher = (
    <WorkspaceSwitcher
      activeWorkspaceId={navigation.activeWorkspaceId}
      onSelectWorkspace={navigation.handleSelectWorkspace}
    />
  );

  if (isError) {
    return <NotesFrame sidebar={workspaceSwitcher} canvas={<ErrorState onRetry={refetch} />} />;
  }
  if (!navigation.activeWorkspaceId) {
    return (
      <NotesFrame
        sidebar={workspaceSwitcher}
        canvas={
          <EmptyState
            icon={<PanelLeft aria-hidden="true" />}
            title="Chưa có workspace"
            hint="Hãy tạo workspace đầu tiên ở bên trái."
          />
        }
      />
    );
  }

  return (
    <ActiveNotesFrame
      workspaceId={navigation.activeWorkspaceId}
      pageId={navigation.pageId}
      workspaceSwitcher={workspaceSwitcher}
      onSelectPage={navigation.handleSelectPage}
    />
  );
}
