'use client';

import { useSyncExternalStore, type KeyboardEvent } from 'react';
import { AlertTriangle, ChevronRight, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { useCreatePage } from '@/features/notes/hooks/use-mutations';
import { usePageChildren } from '@/features/notes/hooks/use-query';
import { useNotesUiStore } from '@/features/notes/stores/notes-ui.store';
import type { Page } from '@/features/notes/types';
import { cn } from '@/lib/utils/cn';
import { PageTreeRowMenu } from './PageTreeRowMenu';

const MAX_TREE_DEPTH = 10;
const CHILD_SKELETON_COUNT = 3;
const focusRingClassName =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const subscribeToMount = () => () => undefined;

function useHasMounted() {
  return useSyncExternalStore(subscribeToMount, () => true, () => false);
}

interface PageTreeRowProps {
  workspaceId: string;
  activePageId: string | null;
  onSelectPage: (id: string) => void;
  page: Page;
  depth: number;
}

function focusVisibleTreeItem(current: HTMLElement, offset: number) {
  const tree = current.closest('[role="tree"]');
  if (!tree) return;
  const items = Array.from(tree.querySelectorAll<HTMLElement>('[role="treeitem"]'));
  const nextItem = items[items.indexOf(current) + offset];
  nextItem?.focus();
}

function focusParentTreeItem(current: HTMLElement) {
  const parentGroup = current.closest('[role="group"]');
  const parentItem = parentGroup?.previousElementSibling;
  if (parentItem instanceof HTMLElement && parentItem.getAttribute('role') === 'treeitem') {
    parentItem.focus();
  }
}

function ChildSkeletons() {
  return (
    <div role="group" className="ml-3 space-y-px">
      {Array.from({ length: CHILD_SKELETON_COUNT }, (_, index) => (
        <Skeleton key={index} rounded="sm" className="h-[30px] w-full" />
      ))}
    </div>
  );
}

export function PageTreeRow({
  workspaceId,
  activePageId,
  onSelectPage,
  page,
  depth,
}: PageTreeRowProps) {
  const isMounted = useHasMounted();
  const persistedExpanded = useNotesUiStore((state) =>
    state.expandedByWorkspace[workspaceId]?.includes(page.id) ?? false,
  );
  const toggleExpanded = useNotesUiStore((state) => state.toggleExpanded);
  const createPage = useCreatePage();
  const isAtMaxDepth = depth >= MAX_TREE_DEPTH - 1;
  const isExpanded = isMounted && persistedExpanded;
  const childrenQuery = usePageChildren(workspaceId, page.id, {
    enabled: isExpanded && !isAtMaxDepth,
  });
  const children = childrenQuery.data;
  const canHaveChildren = !isAtMaxDepth && (!children || children.length > 0);
  const isActive = activePageId === page.id;
  const pageTitle = page.title || 'Không có tiêu đề';

  function handleToggle() {
    if (!isAtMaxDepth) toggleExpanded(workspaceId, page.id);
  }

  function handleCreateChild() {
    if (isAtMaxDepth) return;
    if (!isExpanded) toggleExpanded(workspaceId, page.id);
    createPage.mutate(
      { workspaceId, parentId: page.id },
      { onSuccess: (createdPage) => onSelectPage(createdPage.id) },
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusVisibleTreeItem(event.currentTarget, event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'ArrowRight' && canHaveChildren && !isExpanded) {
      event.preventDefault();
      handleToggle();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (isExpanded) handleToggle();
      else focusParentTreeItem(event.currentTarget);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      onSelectPage(page.id);
    }
  }

  return (
    <div role="none">
      <div
        role="treeitem"
        aria-expanded={canHaveChildren ? isExpanded : undefined}
        aria-level={depth + 1}
        aria-selected={isActive}
        tabIndex={0}
        className={cn(
          'group relative flex h-[30px] min-w-0 cursor-pointer items-center rounded-sm text-sm',
          'text-secondary-foreground hover:bg-sidebar-accent',
          focusRingClassName,
          isActive && 'bg-sidebar-accent text-foreground',
        )}
        onClick={() => onSelectPage(page.id)}
        onKeyDown={handleKeyDown}
      >
        {isActive && (
          <span aria-hidden="true" className="absolute left-0 h-4 w-0.5 bg-primary" />
        )}

        {childrenQuery.isError ? (
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-6 w-3 shrink-0 rounded-sm p-0 text-danger"
            aria-label={`Thử tải lại trang con của ${pageTitle}`}
            title="Thử tải lại"
            onClick={(event) => {
              event.stopPropagation();
              void childrenQuery.refetch();
            }}
          >
            <AlertTriangle aria-hidden="true" className="h-3 w-3" />
          </Button>
        ) : canHaveChildren ? (
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-6 w-3 shrink-0 rounded-sm p-0 text-secondary-foreground hover:bg-sidebar-accent hover:text-foreground"
            aria-label={`${isExpanded ? 'Gập' : 'Mở'} trang ${pageTitle}`}
            title={isExpanded ? 'Gập trang' : 'Mở trang'}
            onClick={(event) => {
              event.stopPropagation();
              handleToggle();
            }}
          >
            <ChevronRight
              aria-hidden="true"
              className={cn(
                'h-3 w-3 transition-transform duration-[120ms] ease-out motion-reduce:transition-none',
                isExpanded && 'rotate-90',
              )}
            />
          </Button>
        ) : (
          <span aria-hidden="true" className="h-6 w-3 shrink-0" />
        )}

        <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center" aria-hidden="true">
          {page.icon ? (
            <span className="text-sm leading-none">{page.icon}</span>
          ) : (
            <FileText className="h-3.5 w-3.5" />
          )}
        </span>
        <span className="ml-2.5 min-w-0 flex-1 truncate">{pageTitle}</span>

        <div
          className="flex shrink-0 opacity-0 transition-opacity duration-[80ms] ease-linear group-hover:opacity-100 group-focus-within:opacity-100"
          onClick={(event) => event.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-6 w-6 rounded-sm p-0 text-secondary-foreground hover:bg-sidebar-accent hover:text-foreground"
            aria-label={`Tạo trang con trong ${pageTitle}`}
            title={isAtMaxDepth ? 'Đã đạt độ sâu tối đa' : 'Tạo trang con'}
            disabled={isAtMaxDepth}
            isLoading={createPage.isPending}
            onClick={handleCreateChild}
          >
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
          </Button>
          <PageTreeRowMenu page={page} />
        </div>
      </div>

      {isExpanded && childrenQuery.isLoading && <ChildSkeletons />}
      {isExpanded && children && children.length > 0 && (
        <div
          role="group"
          className="ml-3 space-y-px animate-in slide-in-from-top-1 duration-[160ms] ease-out motion-reduce:animate-none"
        >
          {children.map((child) => (
            <PageTreeRow
              key={child.id}
              workspaceId={workspaceId}
              activePageId={activePageId}
              onSelectPage={onSelectPage}
              page={child}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
