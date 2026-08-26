'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { PanelLeft } from 'lucide-react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { useWorkspaces } from '@/features/notes/hooks/use-query';
import { useNotesUiStore } from '@/features/notes/stores/notes-ui.store';
import { NoteCanvas } from './NoteCanvas';
import { SidePanel } from './panel/SidePanel';
import { QuickSearchDialog } from './search/QuickSearchDialog';
import { FavoriteList } from './sidebar/FavoriteList';
import { PageTree } from './sidebar/PageTree';
import { SharedList } from './sidebar/SharedList';
import { TrashLink } from './sidebar/TrashLink';
import { WorkspaceSwitcher } from './sidebar/WorkspaceSwitcher';
import { TrashView } from './trash/TrashView';

/** `Cmd/Ctrl+K` mở tìm nhanh — global trong khi đứng ở `/notes/*`, chặn cả
 * shortcut mặc định của trình duyệt (focus thanh địa chỉ). */
function useQuickSearchShortcut() {
  const [isOpen, setOpen] = useState(false);
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((open) => !open);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  return { isOpen, setOpen };
}

interface NotesFrameProps {
  sidebar: ReactNode;
  children: ReactNode;
}

function NotesFrame({ sidebar, children }: NotesFrameProps) {
  return (
    <div className="flex h-full min-w-0 flex-1 overflow-hidden bg-background">
      <aside className="w-[260px] shrink-0 overflow-y-auto bg-sidebar py-2">{sidebar}</aside>
      {children}
    </div>
  );
}

function CanvasFallback({ children }: { children: ReactNode }) {
  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-background">
      <div aria-hidden="true" className="h-[44px]" />
      <div className="mx-auto w-full max-w-[45rem] px-6 pt-24">{children}</div>
    </main>
  );
}

function NotesLayoutSkeleton() {
  return (
    <NotesFrame
      sidebar={(
        <div className="space-y-px px-2">
          <Skeleton rounded="sm" className="mb-4 h-10 w-full" />
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} rounded="sm" className="h-[30px] w-full" />
          ))}
        </div>
      )}
    >
      <CanvasFallback>
        <div data-testid="notes-layout-loading" className="space-y-6">
          <Skeleton rounded="sm" className="h-11 w-2/3" />
          <Skeleton rounded="sm" className="h-20 w-full" />
        </div>
      </CanvasFallback>
    </NotesFrame>
  );
}

function useNotesNavigation() {
  const pathname = usePathname();
  const params = useParams<{ workspaceId?: string; pageId?: string }>();
  const router = useRouter();
  // `/notes/trash` không có [workspaceId] trong path (thùng rác dùng workspace
  // đang hoạt động, không phải một route con của workspace) — phải phân biệt
  // với "chưa chọn workspace" để không bị effect dưới điều hướng nhầm đi.
  const isTrashRoute = pathname === '/notes/trash';
  const routeWorkspaceId = params.workspaceId ?? null;
  const storedWorkspaceId = useNotesUiStore((state) => state.activeWorkspaceId);
  const setActiveWorkspace = useNotesUiStore((state) => state.setActiveWorkspace);
  const workspacesQuery = useWorkspaces();

  useEffect(() => {
    if (routeWorkspaceId) {
      if (storedWorkspaceId !== routeWorkspaceId) setActiveWorkspace(routeWorkspaceId);
      return;
    }
    if (isTrashRoute && storedWorkspaceId) return;
    const firstWorkspace = workspacesQuery.data?.[0];
    if (!firstWorkspace) return;
    setActiveWorkspace(firstWorkspace.id);
    if (!isTrashRoute) router.replace(`/notes/${firstWorkspace.id}`);
  }, [isTrashRoute, routeWorkspaceId, router, setActiveWorkspace, storedWorkspaceId, workspacesQuery.data]);

  const handleSelectWorkspace = useCallback((id: string) => {
    setActiveWorkspace(id);
    router.push(`/notes/${id}`);
  }, [router, setActiveWorkspace]);
  const activeWorkspaceId = routeWorkspaceId ?? storedWorkspaceId;
  // Dùng activeWorkspaceId (có fallback từ store), không phải routeWorkspaceId:
  // trên /notes/trash không có [workspaceId] trong path nên routeWorkspaceId luôn
  // null, làm click chọn trang trong sidebar khi đang ở thùng rác thành vô tác dụng.
  const handleSelectPage = useCallback((id: string) => {
    if (activeWorkspaceId) router.push(`/notes/${activeWorkspaceId}/${id}`);
  }, [activeWorkspaceId, router]);

  return {
    activeWorkspaceId,
    handleSelectPage,
    handleSelectWorkspace,
    isTrashRoute,
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
  isTrashRoute: boolean;
}

function ActiveNotesFrame({ workspaceId, pageId, workspaceSwitcher,
  onSelectPage, isTrashRoute,
}: ActiveNotesFrameProps) {
  const quickSearch = useQuickSearchShortcut();
  const { data: workspaces } = useWorkspaces();
  const activeWorkspace = workspaces?.find((item) => item.id === workspaceId);
  return (
    <NotesFrame
      sidebar={(
        <div className="space-y-4">
          {workspaceSwitcher}
          <div>
            <FavoriteList onSelectPage={onSelectPage} />
            {activeWorkspace?.myRole && (
              <SharedList
                workspaceId={workspaceId}
                isGuest={activeWorkspace.myRole === 'GUEST'}
                onSelectPage={onSelectPage}
              />
            )}
            <PageTree
              workspaceId={workspaceId}
              activePageId={pageId}
              onSelectPage={onSelectPage}
            />
          </div>
          <div className="px-2"><TrashLink /></div>
        </div>
      )}
    >
      {isTrashRoute ? <TrashView workspaceId={workspaceId} /> : (
        <div data-testid="notes-content-flow" className="flex min-w-0 flex-1">
          <NoteCanvas pageId={pageId} onSelectPage={onSelectPage} />
          <SidePanel />
        </div>
      )}
      <QuickSearchDialog
        workspaceId={workspaceId}
        open={quickSearch.isOpen}
        onOpenChange={quickSearch.setOpen}
        onSelectPage={onSelectPage}
      />
    </NotesFrame>
  );
}

export function NotesLayout() {
  const navigation = useNotesNavigation();
  const { data: workspaces, isLoading, isError, refetch } = navigation.workspacesQuery;

  const waitingForWorkspaceRedirect = !navigation.routeWorkspaceId && !navigation.isTrashRoute
    && workspaces && workspaces.length > 0;
  if (isLoading || waitingForWorkspaceRedirect) {
    return <NotesLayoutSkeleton />;
  }

  const workspaceSwitcher = (
    <WorkspaceSwitcher
      activeWorkspaceId={navigation.activeWorkspaceId}
      onSelectWorkspace={navigation.handleSelectWorkspace}
    />
  );

  if (isError) {
    return (
      <NotesFrame sidebar={workspaceSwitcher}>
        <CanvasFallback><ErrorState onRetry={refetch} /></CanvasFallback>
      </NotesFrame>
    );
  }
  if (!navigation.activeWorkspaceId) {
    return (
      <NotesFrame sidebar={workspaceSwitcher}>
        <CanvasFallback>
          <EmptyState
            icon={<PanelLeft aria-hidden="true" />}
            title="Chưa có workspace"
            hint="Hãy tạo workspace đầu tiên ở bên trái."
          />
        </CanvasFallback>
      </NotesFrame>
    );
  }

  return (
    <ActiveNotesFrame
      workspaceId={navigation.activeWorkspaceId}
      pageId={navigation.pageId}
      workspaceSwitcher={workspaceSwitcher}
      onSelectPage={navigation.handleSelectPage}
      isTrashRoute={navigation.isTrashRoute}
    />
  );
}
