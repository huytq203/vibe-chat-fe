import type { Board, BoardColumn, BoardTask, TaskPriority } from '../types';

/**
 * Pure functions áp delta từ socket event thẳng vào Board cache (setQueryData)
 * thay vì invalidate + refetch — độ trễ chỉ còn 1 chặng WS.
 *
 * Contract: trả `null` khi không áp được (task/cột không có trong cache,
 * payload thiếu) → caller fallback sang invalidateQueries. Không bao giờ
 * mutate board đầu vào (React Query cần reference mới để re-render).
 */

export interface TaskMovedEvent {
  taskId: string;
  columnId: string;
  position?: number;
}

/** Field của UpdateTaskDto/emitWorkflowChange có mặt trên BoardTask */
export interface TaskChanges {
  title?: string;
  priority?: TaskPriority | null;
  dueDate?: string | null;
  isPinned?: boolean;
  completedAt?: string | null;
  reviewRequestedAt?: string | null;
  status?: BoardTask['status'];
  /** Có trong DTO nhưng không render trên board — bỏ qua khi merge */
  description?: string | null;
}

export interface TaskUpdatedEvent {
  taskId: string;
  changes: TaskChanges;
}

/** Payload task:created = TaskResponseDto (BE) — task mới nên tags/counts rỗng */
export interface TaskCreatedEvent {
  id: string;
  columnId: string;
  title: string;
  position: number;
  isPinned: boolean;
  status: BoardTask['status'];
  completedAt?: string | null;
  reviewRequestedAt?: string | null;
  parentId?: string | null;
}

export interface ColumnCreatedEvent {
  id: string;
  name: string;
  color: string | null;
  position: number;
  isDoneCol: boolean;
}

export interface ColumnUpdatedEvent {
  columnId: string;
  changes: Partial<Pick<BoardColumn, 'name' | 'color' | 'position' | 'isDoneCol'>>;
}

const byPosition = (a: { position: number }, b: { position: number }): number =>
  a.position - b.position;

function findTask(board: Board, taskId: string): BoardTask | undefined {
  for (const col of board.columns) {
    const t = col.tasks.find((x) => x.id === taskId);
    if (t) return t;
  }
  return undefined;
}

export function applyTaskMoved(board: Board, ev: TaskMovedEvent): Board | null {
  const task = findTask(board, ev.taskId);
  if (!task) return null;
  if (!board.columns.some((c) => c.id === ev.columnId)) return null;

  const moved: BoardTask = {
    ...task,
    columnId: ev.columnId,
    position: ev.position ?? task.position,
  };
  return {
    ...board,
    columns: board.columns.map((col) => {
      const rest = col.tasks.filter((t) => t.id !== ev.taskId);
      if (col.id !== ev.columnId) {
        return rest.length === col.tasks.length ? col : { ...col, tasks: rest };
      }
      return { ...col, tasks: [...rest, moved].sort(byPosition) };
    }),
  };
}

export function applyTaskUpdated(board: Board, ev: TaskUpdatedEvent): Board | null {
  if (!findTask(board, ev.taskId)) return null;
  const { title, priority, dueDate, isPinned, completedAt, reviewRequestedAt, status } =
    ev.changes;
  // Chỉ merge field được whitelist — payload socket có thể chứa field lạ
  const patch: Partial<BoardTask> = {};
  if (title !== undefined) patch.title = title;
  if (priority !== undefined) patch.priority = priority;
  if (dueDate !== undefined) patch.dueDate = dueDate;
  if (isPinned !== undefined) patch.isPinned = isPinned;
  if (completedAt !== undefined) patch.completedAt = completedAt;
  if (reviewRequestedAt !== undefined) patch.reviewRequestedAt = reviewRequestedAt;
  if (status !== undefined) patch.status = status;

  return {
    ...board,
    columns: board.columns.map((col) =>
      col.tasks.some((t) => t.id === ev.taskId)
        ? {
            ...col,
            tasks: col.tasks.map((t) => (t.id === ev.taskId ? { ...t, ...patch } : t)),
          }
        : col,
    ),
  };
}

export function applyTaskCreated(board: Board, ev: TaskCreatedEvent): Board | null {
  // Subtask là task thật nhưng không render thành card trên board
  if (ev.parentId) return board;
  const col = board.columns.find((c) => c.id === ev.columnId);
  if (!col) return null;

  const created: BoardTask = {
    id: ev.id,
    columnId: ev.columnId,
    title: ev.title,
    position: ev.position,
    isPinned: ev.isPinned,
    priority: null,
    dueDate: null,
    tags: [],
    assignees: [],
    checklistCount: 0,
    commentCount: 0,
    completedAt: ev.completedAt ?? null,
    reviewRequestedAt: ev.reviewRequestedAt ?? null,
    status: ev.status,
  };
  return {
    ...board,
    columns: board.columns.map((c) =>
      c.id === ev.columnId
        ? {
            ...c,
            // Dedupe: event của chính mình có thể tới sau khi refetch đã chèn task
            tasks: [...c.tasks.filter((t) => t.id !== ev.id), created].sort(byPosition),
          }
        : c,
    ),
  };
}

export function applyTaskDeleted(board: Board, ev: { taskId: string }): Board {
  if (!findTask(board, ev.taskId)) return board;
  return {
    ...board,
    columns: board.columns.map((col) =>
      col.tasks.some((t) => t.id === ev.taskId)
        ? { ...col, tasks: col.tasks.filter((t) => t.id !== ev.taskId) }
        : col,
    ),
  };
}

export function applyColumnCreated(board: Board, ev: ColumnCreatedEvent): Board {
  // Đã có (event của chính mình sau refetch) → giữ nguyên, không thay bằng cột rỗng
  if (board.columns.some((c) => c.id === ev.id)) return board;
  const created: BoardColumn = { ...ev, tasks: [] };
  return { ...board, columns: [...board.columns, created].sort(byPosition) };
}

export function applyColumnUpdated(board: Board, ev: ColumnUpdatedEvent): Board | null {
  if (!board.columns.some((c) => c.id === ev.columnId)) return null;
  return {
    ...board,
    columns: board.columns
      .map((c) => (c.id === ev.columnId ? { ...c, ...ev.changes } : c))
      .sort(byPosition),
  };
}

export function applyColumnDeleted(board: Board, ev: { columnId: string }): Board {
  return { ...board, columns: board.columns.filter((c) => c.id !== ev.columnId) };
}

function patchTask(board: Board, taskId: string, patch: (t: BoardTask) => BoardTask): Board | null {
  if (!findTask(board, taskId)) return null;
  return {
    ...board,
    columns: board.columns.map((col) =>
      col.tasks.some((t) => t.id === taskId)
        ? { ...col, tasks: col.tasks.map((t) => (t.id === taskId ? patch(t) : t)) }
        : col,
    ),
  };
}

/** Cộng/trừ counter trên card (commentCount/checklistCount là TỔNG số — khớp _count BE) */
export function bumpTaskCount(
  board: Board,
  taskId: string,
  field: 'commentCount' | 'checklistCount',
  delta: number,
): Board | null {
  return patchTask(board, taskId, (t) => ({
    ...t,
    [field]: Math.max(0, t[field] + delta),
  }));
}

export interface AssigneeAddedEvent {
  taskId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

export function applyAssigneeAdded(board: Board, ev: AssigneeAddedEvent): Board | null {
  return patchTask(board, ev.taskId, (t) => ({
    ...t,
    assignees: [
      ...t.assignees.filter((a) => a.userId !== ev.userId),
      { userId: ev.userId, displayName: ev.displayName, avatarUrl: ev.avatarUrl },
    ],
  }));
}

export function applyAssigneeRemoved(
  board: Board,
  ev: { taskId: string; userId: string },
): Board | null {
  return patchTask(board, ev.taskId, (t) => ({
    ...t,
    assignees: t.assignees.filter((a) => a.userId !== ev.userId),
  }));
}

export function applyTagAttached(
  board: Board,
  ev: { taskId: string; tag: BoardTask['tags'][number] },
): Board | null {
  return patchTask(board, ev.taskId, (t) => ({
    ...t,
    tags: [...t.tags.filter((x) => x.id !== ev.tag.id), ev.tag],
  }));
}

export function applyTagDetached(
  board: Board,
  ev: { taskId: string; tagId: string },
): Board | null {
  return patchTask(board, ev.taskId, (t) => ({
    ...t,
    tags: t.tags.filter((x) => x.id !== ev.tagId),
  }));
}
