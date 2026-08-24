'use client';

import { useCallback, useEffect, type ReactNode } from 'react';
import { FileText, PanelLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { usePage, useWorkspaces } from '@/features/notes/hooks/use-query';
import { useNotesUiStore } from '@/features/notes/stores/notes-ui.store';
import { Breadcrumb } from './page/Breadcrumb';
import { PageIcon } from './page/PageIcon';
import { FavoriteList } from './sidebar/FavoriteList';
import { PageTree } from './sidebar/PageTree';
import { WorkspaceSwitcher } from './sidebar/WorkspaceSwitcher';

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

interface SelectedPageCanvasProps {
  pageId: string;
}

function SelectedPageCanvas({ pageId }: SelectedPageCanvasProps) {
  const { data, isLoading, isError, refetch } = usePage(pageId);

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="page-canvas-loading">
        <Skeleton rounded="sm" className="h-11 w-2/3" />
        <Skeleton rounded="sm" className="h-20 w-full" />
      </div>
    );
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
      <h1 className="font-display text-[36px] font-bold leading-[44px] tracking-[-0.5px]">
        {data.title || 'Không có tiêu đề'}
      </h1>
      <div className="mt-10 rounded-lg bg-sidebar px-4 py-3 text-sm text-muted-foreground">
        Trình soạn thảo sẽ có ở mốc M3.
      </div>
    </article>
  );
}

function PageCanvas({ pageId }: { pageId: string | null }) {
  if (pageId) return <SelectedPageCanvas pageId={pageId} />;

  return (
    <EmptyState
      icon={<PanelLeft aria-hidden="true" />}
      title="Chọn một trang ở bên trái"
      hint="Nội dung trang sẽ xuất hiện tại đây."
    />
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
  const topbar = pageId ? (
    <Breadcrumb pageId={pageId} onSelectPage={onSelectPage} />
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
      canvas={<PageCanvas pageId={pageId} />}
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
