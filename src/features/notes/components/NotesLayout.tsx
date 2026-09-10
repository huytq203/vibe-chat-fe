'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { FileText, PanelLeft, Search } from 'lucide-react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button/Button';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { useWorkspaces } from '@/features/notes/hooks/use-query';
import { useNotesUiStore } from '@/features/notes/stores/notes-ui.store';
import { cn } from '@/lib/utils/cn';
import { NoteCanvas } from './NoteCanvas';
import { SidePanel } from './panel/SidePanel';
import { QuickSearchDialog } from './search/QuickSearchDialog';
import { FavoriteList } from './sidebar/FavoriteList';
import { NewPageButton } from './sidebar/NewPageButton';
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
  mobilePane?: 'sidebar' | 'content';
}

function NotesFrame({ sidebar, children, mobilePane = 'content' }: NotesFrameProps) {
  return (
    <div className="flex h-full min-w-0 flex-1 overflow-hidden bg-background md:gap-3">
      <aside
        data-testid="notes-sidebar-surface"
        className={cn(
          'h-full w-full shrink-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground',
          'md:flex md:w-[300px] md:min-w-[260px] md:rounded-2xl md:border md:bg-sidebar/75 md:shadow-subtle md:backdrop-blur-md',
          mobilePane === 'sidebar' ? 'flex' : 'hidden',
        )}
      >
        {sidebar}
      </aside>
      <div
        data-testid="notes-main-pane"
        className={cn(
          'h-full min-w-0 flex-1 overflow-hidden md:flex',
          mobilePane === 'content' ? 'flex' : 'hidden',
        )}
      >
        {children}
      </div>
    </div>
  );
}

function CanvasFallback({ children }: { children: ReactNode }) {
  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-background md:rounded-2xl md:border md:shadow-subtle">
      <div aria-hidden="true" className="h-14 border-b border-border" />
      <div className="mx-auto w-full max-w-[45rem] px-4 pt-12 sm:px-6 md:px-6 md:pt-16">
        {children}
      </div>
    </main>
  );
}

function NotesLayoutSkeleton() {
  return (
    <NotesFrame
      mobilePane="sidebar"
      sidebar={(
        <div className="flex h-full flex-col px-3 pb-[var(--safe-bottom)] pt-[calc(var(--safe-top)+0.75rem)] md:py-3">
          <Skeleton rounded="sm" className="mb-3 h-10 w-full" />
          <div className="space-y-1">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} rounded="sm" className="h-11 w-full md:h-9" />
            ))}
          </div>
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
  const handleBackToPages = useCallback(() => {
    if (activeWorkspaceId) router.push(`/notes/${activeWorkspaceId}`);
  }, [activeWorkspaceId, router]);

  return {
    activeWorkspaceId,
    handleBackToPages,
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
  onBackToPages: () => void;
  isTrashRoute: boolean;
}

function ActiveNotesFrame({ workspaceId, pageId, workspaceSwitcher,
  onSelectPage, onBackToPages, isTrashRoute,
}: ActiveNotesFrameProps) {
  const quickSearch = useQuickSearchShortcut();
  const { data: workspaces } = useWorkspaces();
  const activeWorkspace = workspaces?.find((item) => item.id === workspaceId);
  const showContentOnMobile = Boolean(pageId || isTrashRoute);

  const sidebar = (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-border px-3 pb-3 pt-[calc(var(--safe-top)+0.75rem)] md:border-b-0 md:pt-3">
        <div className="flex h-10 items-center gap-2.5 px-1">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <FileText aria-hidden="true" className="size-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-bold text-foreground">Ghi chú</h1>
            <p className="truncate text-[11.5px] text-muted-foreground">Không gian tài liệu của bạn</p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-9 rounded-xl text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            aria-label="Tìm nhanh trang"
            title="Tìm nhanh (Ctrl+K)"
            onClick={() => quickSearch.setOpen(true)}
          >
            <Search aria-hidden="true" className="size-4" />
          </Button>
        </div>
        <div className="mt-2">{workspaceSwitcher}</div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        <FavoriteList onSelectPage={onSelectPage} />
        {activeWorkspace?.myRole && (
          <SharedList
            workspaceId={workspaceId}
            isGuest={activeWorkspace.myRole === 'GUEST'}
            onSelectPage={onSelectPage}
          />
        )}
        <section aria-labelledby="pages-heading">
          <div className="flex h-8 items-center gap-2 pl-4 pr-2.5">
            <span
              id="pages-heading"
              className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Trang
            </span>
            {activeWorkspace?.myRole !== 'GUEST' && (
              <NewPageButton workspaceId={workspaceId} onSelectPage={onSelectPage} />
            )}
          </div>
          <PageTree
            workspaceId={workspaceId}
            activePageId={pageId}
            onSelectPage={onSelectPage}
          />
        </section>
      </div>

      <footer className="shrink-0 border-t border-border px-2 pb-[calc(var(--safe-bottom)+0.5rem)] pt-2 md:pb-2">
        <TrashLink />
      </footer>
    </div>
  );

  return (
    <NotesFrame
      sidebar={sidebar}
      mobilePane={showContentOnMobile ? 'content' : 'sidebar'}
    >
      {isTrashRoute ? (
        <TrashView workspaceId={workspaceId} onBack={onBackToPages} />
      ) : (
        <div data-testid="notes-content-flow" className="flex h-full min-w-0 flex-1 overflow-hidden">
          <NoteCanvas
            pageId={pageId}
            onSelectPage={onSelectPage}
            onBack={onBackToPages}
          />
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
      <NotesFrame sidebar={workspaceSwitcher} mobilePane="sidebar">
        <CanvasFallback><ErrorState onRetry={refetch} /></CanvasFallback>
      </NotesFrame>
    );
  }
  if (!navigation.activeWorkspaceId) {
    return (
      <NotesFrame sidebar={workspaceSwitcher} mobilePane="sidebar">
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
      onBackToPages={navigation.handleBackToPages}
      onSelectPage={navigation.handleSelectPage}
      isTrashRoute={navigation.isTrashRoute}
    />
  );
}
