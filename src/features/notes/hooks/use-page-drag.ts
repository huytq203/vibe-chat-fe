'use client';

import {
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useMovePage } from '@/features/notes/hooks/use-mutations';
import { sortKeyForDrop } from '@/features/notes/lib/sort-key';
import type { Page } from '@/features/notes/types';
import { notionKeys } from '@/services/keys';

const MAX_TREE_DEPTH = 10;

export type PageDragData = { kind: 'page'; page: Page };
export type PageInsideDropData = { kind: 'inside'; target: Page };
export type PageGapDropData = {
  kind: 'gap';
  parentId: string | null;
  parentPath: string | null;
  parentDepth: number;
  siblings: Page[];
  insertIndex: number;
};
export type PageDropData = PageInsideDropData | PageGapDropData;

type MovePageInput = {
  id: string;
  workspaceId: string;
  parentId: string | null;
  fromParentId: string | null;
  sortKey?: string;
};

function isPage(value: unknown): value is Page {
  if (!value || typeof value !== 'object') return false;
  const page = value as { id?: unknown; path?: unknown; depth?: unknown };
  return typeof page.id === 'string' && typeof page.path === 'string' &&
    typeof page.depth === 'number';
}

export function readPageDragData(value: unknown): PageDragData | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as { kind?: unknown; page?: unknown };
  return data.kind === 'page' && isPage(data.page) ? { kind: 'page', page: data.page } : null;
}

export function readPageDropData(value: unknown): PageDropData | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as {
    kind?: unknown;
    target?: unknown;
    siblings?: unknown;
    parentDepth?: unknown;
    insertIndex?: unknown;
  };
  if (data.kind === 'inside' && isPage(data.target)) return { kind: 'inside', target: data.target };
  if (data.kind !== 'gap' || !Array.isArray(data.siblings)) return null;
  if (typeof data.parentDepth !== 'number' || typeof data.insertIndex !== 'number') return null;
  return data as PageGapDropData;
}

export function isInvalidPageDrop(dragged: Page, drop: PageDropData): boolean {
  const targetPath = drop.kind === 'inside' ? drop.target.path : drop.parentPath;
  const parentDepth = drop.kind === 'inside' ? drop.target.depth : drop.parentDepth;
  // Đây chỉ là kiểm tra miễn phí từ dữ liệu đã có; BE vẫn kiểm đủ chiều cao cả nhánh.
  return Boolean(targetPath?.startsWith(dragged.path)) || parentDepth + 1 > MAX_TREE_DEPTH;
}

function orderedPages(pages: Page[]) {
  return [...pages].sort((left, right) => {
    if (left.sortKey === right.sortKey) return 0;
    return left.sortKey < right.sortKey ? -1 : 1;
  });
}

function destinationForDrop(
  queryClient: QueryClient,
  workspaceId: string,
  drop: PageDropData,
) {
  if (drop.kind === 'gap') return { ...drop, siblings: orderedPages(drop.siblings) };
  const key = notionKeys.pageChildren(workspaceId, drop.target.id);
  const siblings = queryClient.getQueryData<Page[]>(key);
  return {
    parentId: drop.target.id,
    siblings: siblings ? orderedPages(siblings) : undefined,
    insertIndex: siblings?.length ?? 0,
  };
}

export function buildMovePageInput(
  queryClient: QueryClient,
  workspaceId: string,
  dragged: Page,
  drop: PageDropData,
): MovePageInput | null {
  if (isInvalidPageDrop(dragged, drop)) return null;
  const destination = destinationForDrop(queryClient, workspaceId, drop);
  if (!destination.siblings) {
    return { id: dragged.id, workspaceId, parentId: destination.parentId,
      fromParentId: dragged.parentId };
  }
  const oldIndex = destination.siblings.findIndex((page) => page.id === dragged.id);
  const siblings = destination.siblings.filter((page) => page.id !== dragged.id);
  const index = destination.insertIndex - (oldIndex >= 0 && oldIndex < destination.insertIndex ? 1 : 0);
  if (dragged.parentId === destination.parentId && oldIndex === index) return null;
  return {
    id: dragged.id,
    workspaceId,
    parentId: destination.parentId,
    fromParentId: dragged.parentId,
    sortKey: sortKeyForDrop(siblings, index),
  };
}

function pageTitle(value: unknown) {
  return readPageDragData(value)?.page.title || 'Không có tiêu đề';
}

export const pageDragAnnouncements: Announcements = {
  onDragStart: ({ active }) => `Đã bắt đầu kéo trang ${pageTitle(active.data.current)}.`,
  onDragOver: ({ active, over }) => {
    const dragged = readPageDragData(active.data.current)?.page;
    const drop = readPageDropData(over?.data.current);
    if (!dragged || !drop) return 'Chưa có vị trí thả.';
    return isInvalidPageDrop(dragged, drop)
      ? 'Không thể thả trang vào vị trí này.'
      : 'Có thể thả trang vào vị trí hiện tại.';
  },
  onDragEnd: ({ active, over }) => {
    const dragged = readPageDragData(active.data.current)?.page;
    const drop = readPageDropData(over?.data.current);
    if (!dragged || !drop) return 'Đã huỷ kéo trang.';
    return isInvalidPageDrop(dragged, drop)
      ? 'Không thể thả trang vào vị trí này.'
      : `Đã thả trang ${pageTitle(active.data.current)}.`;
  },
  onDragCancel: () => 'Đã huỷ kéo trang.',
};

export function usePageDrag(workspaceId: string) {
  const queryClient = useQueryClient();
  const movePage = useMovePage();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  );

  function moveToTarget(dragged: Page, drop: PageDropData) {
    const input = buildMovePageInput(queryClient, workspaceId, dragged, drop);
    if (input) movePage.mutate(input);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    const dragged = readPageDragData(active.data.current)?.page;
    const drop = readPageDropData(over?.data.current);
    if (dragged && drop) moveToTarget(dragged, drop);
  }

  return { sensors, handleDragEnd, moveToTarget };
}

export function usePageRowDrag(page: Page) {
  const dragData: PageDragData = { kind: 'page', page };
  const insideDropData: PageInsideDropData = { kind: 'inside', target: page };
  const draggable = useDraggable({
    id: `page:${page.id}`,
    data: dragData,
    attributes: { role: 'treeitem', roleDescription: 'trang có thể kéo', tabIndex: 0 },
  });
  const droppable = useDroppable({ id: `inside:${page.id}`, data: insideDropData });
  const dragged = readPageDragData(draggable.active?.data.current)?.page;
  const currentDrop = readPageDropData(draggable.over?.data.current);
  const isInsideInvalid = Boolean(dragged && isInvalidPageDrop(dragged, insideDropData));
  const isCurrentDropInvalid = Boolean(
    dragged && currentDrop && isInvalidPageDrop(dragged, currentDrop),
  );
  const rowStyle = draggable.transform
    ? { transform: `translate3d(${draggable.transform.x}px, ${draggable.transform.y}px, 0)` }
    : undefined;

  function setRowRef(element: HTMLDivElement | null) {
    draggable.setNodeRef(element);
    droppable.setNodeRef(element);
  }

  return { draggable, droppable, isInsideInvalid, isCurrentDropInvalid, rowStyle, setRowRef };
}
