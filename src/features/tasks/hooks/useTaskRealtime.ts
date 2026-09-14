'use client';

import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { getTaskSocket } from '../lib/task-socket';
import { getCurrentUser } from '../lib/current-user';
import { scheduleInvalidate } from '../lib/invalidate-scheduler';
import { isLocal } from '../lib/local-mutations';
import { taskKeys } from '../services/keys';
import { tasksApi } from '../services/tasks.api';
import {
  applyTaskMoved,
  applyTaskUpdated,
  applyTaskCreated,
  applyTaskDeleted,
  applyColumnCreated,
  applyColumnUpdated,
  applyColumnDeleted,
  bumpTaskCount,
  applyAssigneeAdded,
  applyAssigneeRemoved,
  applyTagAttached,
  applyTagDetached,
} from '../lib/board-cache';
import { upsertById, patchById, removeById } from '../lib/list-cache';
import type {
  TaskCreatedEvent,
  TaskMovedEvent,
  TaskUpdatedEvent,
  ColumnCreatedEvent,
  ColumnUpdatedEvent,
} from '../lib/board-cache';
import type {
  Attachment,
  Board,
  BoardTask,
  ChecklistItem,
  Comment,
  SubtaskItem,
  TaskDetail,
} from '../types';

/**
 * Chiến lược realtime: payload event được ÁP THẲNG vào cache (setQueryData)
 * để UI nhảy ngay 1 chặng WS — như Google Sheets. Chỉ fallback
 * invalidate + refetch khi delta không áp được (cache lệch server) hoặc
 * payload không đủ dữ liệu (aggregate: feed/my/reports).
 */

// ── Cache helpers ────────────────────────────────────────────────────────────

/** Áp delta vào board; delta trả null → refetch để reconcile */
function boardDelta(
  qc: QueryClient,
  projectId: string,
  delta: (board: Board) => Board | null,
  allowInvalidate = true,
): void {
  const key = taskKeys.board(projectId);
  const prev = qc.getQueryData<Board>(key);
  if (!prev) return; // board chưa fetch → query sẽ lấy bản mới khi mount
  const next = delta(prev);
  if (next) qc.setQueryData(key, next);
  else if (allowInvalidate) scheduleInvalidate(qc, key);
}

/**
 * Như boardDelta nhưng miss → bỏ qua thay vì refetch. Dùng cho event trên
 * task có thể là subtask (không render thành card) — miss là bình thường.
 */
function boardDeltaSoft(
  qc: QueryClient,
  projectId: string,
  delta: (board: Board) => Board | null,
): void {
  boardDelta(qc, projectId, (b) => delta(b) ?? b);
}

/** Write-through vào cache dạng list; chưa có cache → thôi (mount sẽ fetch) */
function listDelta<T>(
  qc: QueryClient,
  key: readonly unknown[],
  delta: (list: T[]) => T[] | null,
): void {
  const prev = qc.getQueryData<T[]>(key);
  if (!prev) return;
  const next = delta(prev);
  if (next) qc.setQueryData(key, next);
  else scheduleInvalidate(qc, key);
}

const subKey = (projectId: string, taskId: string, sub: string): readonly unknown[] =>
  ['tasks', projectId, taskId, sub] as const;

const byCreatedAt = (a: { createdAt: string }, b: { createdAt: string }): number =>
  a.createdAt.localeCompare(b.createdAt);

const byPosition = (a: { position: number }, b: { position: number }): number =>
  a.position - b.position;

type RealtimeTask = TaskDetail & Partial<Pick<BoardTask, 'assignees' | 'checklistCount'>>;

function taskFromPayload(payload: unknown): RealtimeTask | undefined {
  if (typeof payload !== 'object' || payload === null || !('task' in payload)) return undefined;
  const task = (payload as { task?: unknown }).task;
  return typeof task === 'object' && task !== null && 'id' in task
    ? (task as RealtimeTask)
    : undefined;
}

/** Ghi task đầy đủ từ socket vào board, kể cả khi task vừa chuyển cột. */
function applyTaskPayload(board: Board, task: RealtimeTask): Board | null {
  const current = board.columns.flatMap((column) => column.tasks).find((item) => item.id === task.id);
  if (task.parentId) return applyTaskDeleted(board, { taskId: task.id });
  const targetColumn = board.columns.find((column) => column.id === task.columnId);
  if (!targetColumn) return null;

  const nextTask: BoardTask = {
    id: task.id,
    version: task.version,
    columnId: task.columnId,
    title: task.title,
    position: task.position,
    isPinned: task.isPinned,
    priority: task.priority,
    gem: task.gem,
    gemSource: task.gemSource,
    dueDate: task.dueDate,
    tags: task.tags.map(({ id, name, color }) => ({ id, name, color })),
    assignees: task.assignees ?? current?.assignees ?? [],
    checklistCount: task.checklistCount ?? task.checklistTotal,
    commentCount: task.commentCount,
    completedAt: task.completedAt,
    reviewRequestedAt: task.reviewRequestedAt,
    status: task.status,
  };

  return {
    ...board,
    columns: board.columns.map((column) => ({
      ...column,
      tasks: column.id === task.columnId
        ? [...column.tasks.filter((item) => item.id !== task.id), nextTask].sort(byPosition)
        : column.tasks.filter((item) => item.id !== task.id),
    })),
  };
}

function writeTaskPayload(
  qc: QueryClient,
  projectId: string,
  task: RealtimeTask,
  allowInvalidate = true,
): void {
  boardDelta(qc, projectId, (board) => applyTaskPayload(board, task), allowInvalidate);
  // Payload sự kiện là thẻ board (không có description…) — chỉ MERGE lên detail đã có,
  // không thay thế: thay thế sẽ làm editor mô tả thấy rỗng rồi lưu đè mất nội dung.
  // Thẻ board không mang description có thẩm quyền — chỉ nhận description qua `changes`.
  qc.setQueryData<RealtimeTask>(subKey(projectId, task.id, 'detail'), (previous) =>
    previous ? { ...previous, ...task, description: previous.description } : previous,
  );
}

function toSubtaskItem(task: RealtimeTask): SubtaskItem {
  return {
    id: task.id,
    title: task.title,
    columnId: task.columnId,
    priority: task.priority,
    dueDate: task.dueDate,
    completedAt: task.completedAt,
    status: task.status,
    isPinned: task.isPinned,
    subtaskCount: task.subtaskCount,
    assignees: task.assignees ?? [],
    tags: task.tags.map(({ id, name, color }) => ({ id, name, color })),
  };
}

function writeSubtaskPayload(qc: QueryClient, projectId: string, task: RealtimeTask): void {
  writeTaskPayload(qc, projectId, task);
  if (!task.parentId) return;
  listDelta<SubtaskItem>(qc, subKey(projectId, task.parentId, 'subtasks'), (list) =>
    [...list.filter((item) => item.id !== task.id), toSubtaskItem(task)],
  );
}

// ── Invalidators cho query không delta được từ payload ──────────────────────

function invalidateDetail(qc: QueryClient, projectId: string, taskId: string): void {
  scheduleInvalidate(qc, subKey(projectId, taskId, 'detail'));
}

/**
 * Event trên 1 task có thể là subtask → task cha hiển thị danh sách con
 * (['tasks', projectId, parentId, 'subtasks']). Không biết parentId từ payload
 * nên invalidate MỌI subtask-list của project (rẻ, chỉ list nhỏ).
 */
function invalidateSubtaskLists(qc: QueryClient, projectId: string): void {
  void qc.invalidateQueries(
    {
      predicate: (q) =>
        q.queryKey[0] === 'tasks' && q.queryKey[1] === projectId && q.queryKey[3] === 'subtasks',
    },
    { cancelRefetch: false },
  );
}

/** History trong task detail: ['tasks', projectId, 'activities', taskId] (prefix match) */
function invalidateHistory(qc: QueryClient, projectId: string): void {
  scheduleInvalidate(qc, ['tasks', projectId, 'activities']);
}

/** Feed hoạt động ở Dashboard: ['tasks','feed',page,limit] — KHÁC key history */
function invalidateFeed(qc: QueryClient): void {
  scheduleInvalidate(qc, ['tasks', 'feed']);
}

/** "Việc của tôi" ở Dashboard: ['tasks','my'] */
function invalidateMyTasks(qc: QueryClient): void {
  scheduleInvalidate(qc, ['tasks', 'my']);
}

/** Reports/stats — inactive lúc thường, mark stale để mở tab là fresh */
function invalidateReports(qc: QueryClient, projectId: string): void {
  scheduleInvalidate(qc, ['tasks', 'overview']);
  scheduleInvalidate(qc, ['tasks', projectId, 'stats']);
  scheduleInvalidate(qc, ['tasks', projectId, 'leaderboard']);
}

// ── Event payload types (khớp BE emit — xem task.gateway.ts + các service) ──

interface CommentDeletedEvent {
  commentId: string;
  taskId: string;
}

interface ChecklistToggledEvent {
  itemId: string;
  taskId: string;
  isDone: boolean;
}

interface AttachmentDeletedEvent {
  attachmentId: string;
  taskId: string;
}

interface AssigneeEvent {
  taskId: string;
  userId: string;
  displayName?: string;
  avatarUrl?: string | null;
}

interface TagAttachedEvent {
  taskId: string;
  tag: { id: string; name: string; color: string };
}

type Handler = (qc: QueryClient, projectId: string, payload: unknown) => void;

const EVENT_HANDLERS: Record<string, Handler> = {
  // ── Task trên board: delta thẳng vào cache ──
  'task:created': (qc, projectId, p) => {
    const payloadTask = taskFromPayload(p);
    // WS phát TaskResponseDto trực tiếp; chấp nhận cả wrapper của change-log cũ.
    const task =
      typeof p === 'object' && p !== null && 'task' in p
        ? (p as { task?: TaskCreatedEvent }).task
        : (p as TaskCreatedEvent | null | undefined);
    if (payloadTask) writeTaskPayload(qc, projectId, payloadTask);
    else boardDelta(qc, projectId, (b) => applyTaskCreated(b, task));
    invalidateFeed(qc);
    invalidateReports(qc, projectId);
  },
  'task:updated': (qc, projectId, p) => {
    const ev = p as TaskUpdatedEvent;
    const task = taskFromPayload(p);
    const taskId = task?.id ?? ev.taskId;
    const local = isLocal(taskId, 'task:updated');
    if (task) writeTaskPayload(qc, projectId, task, !local);
    else boardDelta(qc, projectId, (b) => applyTaskUpdated(b, ev), !local);
    if (local) return;
    // description không nằm trong thẻ board → ghi thẳng từ `changes` rồi tải lại detail cho chắc.
    const description = ev.changes?.description;
    if (description !== undefined) {
      qc.setQueryData<RealtimeTask>(subKey(projectId, taskId, 'detail'), (previous) =>
        previous ? { ...previous, description } : previous,
      );
    }
    if (!task || description !== undefined) invalidateDetail(qc, projectId, taskId);
    invalidateSubtaskLists(qc, projectId);
    invalidateHistory(qc, projectId);
    invalidateFeed(qc);
    invalidateMyTasks(qc);
    if (ev.changes?.completedAt !== undefined || ev.changes?.status !== undefined) {
      invalidateReports(qc, projectId);
    }
  },
  'task:moved': (qc, projectId, p) => {
    const ev = p as TaskMovedEvent;
    const task = taskFromPayload(p);
    const taskId = task?.id ?? ev.taskId;
    const local = isLocal(taskId, 'task:moved');
    if (task) writeTaskPayload(qc, projectId, task, !local);
    else boardDelta(qc, projectId, (b) => applyTaskMoved(b, ev), !local);
    if (local) return;
    if (!task) invalidateDetail(qc, projectId, taskId);
    invalidateMyTasks(qc); // MyTask hiển thị columnName
  },
  'task:deleted': (qc, projectId, p) => {
    const ev = p as { taskId: string };
    const task = taskFromPayload(p);
    const taskId = task?.id ?? ev.taskId;
    boardDelta(qc, projectId, (b) => applyTaskDeleted(b, { taskId }));
    qc.removeQueries({ queryKey: subKey(projectId, taskId, 'detail'), exact: true });
    if (isLocal(taskId, 'task:deleted')) return;
    if (!task) invalidateDetail(qc, projectId, taskId);
    invalidateSubtaskLists(qc, projectId);
    invalidateHistory(qc, projectId);
    invalidateFeed(qc);
    invalidateMyTasks(qc);
    invalidateReports(qc, projectId);
  },

  // ── Subtask: payload đầy đủ ghi thẳng vào detail + danh sách của task cha ──
  'subtask:created': (qc, projectId, p) => {
    const task = taskFromPayload(p);
    if (task) writeSubtaskPayload(qc, projectId, task);
    else invalidateSubtaskLists(qc, projectId);
  },
  'subtask:updated': (qc, projectId, p) => {
    const task = taskFromPayload(p);
    const taskId = task?.id ?? (p as { taskId?: string }).taskId;
    if (task) writeSubtaskPayload(qc, projectId, task);
    else {
      invalidateSubtaskLists(qc, projectId);
      if (taskId) invalidateDetail(qc, projectId, taskId);
    }
  },
  'subtask:moved': (qc, projectId, p) => {
    const task = taskFromPayload(p);
    const taskId = task?.id ?? (p as { taskId?: string }).taskId;
    if (task) writeSubtaskPayload(qc, projectId, task);
    else {
      invalidateSubtaskLists(qc, projectId);
      if (taskId) invalidateDetail(qc, projectId, taskId);
    }
  },
  'subtask:deleted': (qc, projectId, p) => {
    const task = taskFromPayload(p);
    const taskId = task?.id ?? (p as { taskId?: string }).taskId;
    if (taskId) qc.removeQueries({ queryKey: subKey(projectId, taskId, 'detail'), exact: true });
    if (task?.parentId) {
      listDelta<SubtaskItem>(qc, subKey(projectId, task.parentId, 'subtasks'), (list) =>
        removeById(list, task.id),
      );
    } else invalidateSubtaskLists(qc, projectId);
  },

  // ── Column ──
  'column:created': (qc, projectId, p) => {
    // WS phát BoardColumnDto trực tiếp; chấp nhận cả wrapper của change-log cũ.
    const column =
      typeof p === 'object' && p !== null && 'column' in p
        ? (p as { column?: ColumnCreatedEvent }).column
        : (p as ColumnCreatedEvent | null | undefined);
    if (column) boardDelta(qc, projectId, (b) => applyColumnCreated(b, column));
    else scheduleInvalidate(qc, taskKeys.board(projectId));
  },
  'column:updated': (qc, projectId, p) => {
    boardDelta(qc, projectId, (b) => applyColumnUpdated(b, p as ColumnUpdatedEvent));
  },
  'column:deleted': (qc, projectId, p) => {
    boardDelta(qc, projectId, (b) => applyColumnDeleted(b, p as { columnId: string }));
    invalidateMyTasks(qc);
    invalidateReports(qc, projectId);
  },

  // ── Project / board lock ──
  'project:updated': (qc, projectId) => {
    scheduleInvalidate(qc, taskKeys.projects());
    scheduleInvalidate(qc, taskKeys.board(projectId));
  },
  'project:deleted': (qc, projectId) => {
    scheduleInvalidate(qc, taskKeys.projects());
    scheduleInvalidate(qc, taskKeys.board(projectId));
    invalidateMyTasks(qc);
    invalidateFeed(qc);
    invalidateReports(qc, projectId);
  },
  'board:locked': (qc, projectId) => {
    boardDelta(qc, projectId, (b) => ({ ...b, project: { ...b.project, isBoardLocked: true } }));
    scheduleInvalidate(qc, taskKeys.projects());
  },
  'board:unlocked': (qc, projectId) => {
    boardDelta(qc, projectId, (b) => ({ ...b, project: { ...b.project, isBoardLocked: false } }));
    scheduleInvalidate(qc, taskKeys.projects());
  },

  // ── Members ──
  'member:added': (qc, projectId) => {
    scheduleInvalidate(qc, ['tasks', projectId, 'members']);
    scheduleInvalidate(qc, ['tasks', projectId, 'leaderboard']);
  },
  'member:removed': (qc, projectId) => {
    scheduleInvalidate(qc, ['tasks', projectId, 'members']);
    scheduleInvalidate(qc, ['tasks', projectId, 'leaderboard']);
  },

  // ── Yêu cầu tham gia (chia sẻ project qua link) ──
  // accept còn bắn 'member:added' → members/board tự refresh.
  'join-request:created': (qc, projectId) => {
    scheduleInvalidate(qc, ['tasks', projectId, 'join-requests']);
  },
  'join-request:updated': (qc, projectId) => {
    scheduleInvalidate(qc, ['tasks', projectId, 'join-requests']);
  },

  // ── Tags của project (đổi tên/màu ảnh hưởng mọi card gắn tag → refetch board) ──
  'tag:created': (qc, projectId) => {
    scheduleInvalidate(qc, ['tasks', projectId, 'tags']);
  },
  'tag:updated': (qc, projectId) => {
    scheduleInvalidate(qc, ['tasks', projectId, 'tags']);
    scheduleInvalidate(qc, taskKeys.board(projectId));
  },
  'tag:deleted': (qc, projectId) => {
    scheduleInvalidate(qc, ['tasks', projectId, 'tags']);
    scheduleInvalidate(qc, taskKeys.board(projectId));
    // Nhãn đã xoá khỏi config → BE cascade gỡ nhãn khỏi mọi task. Phải dọn cache
    // nhãn của từng task đang mở (chip trong modal detail) — không biết task nào
    // từng gắn nên invalidate mọi per-task tags (['tasks', projectId, taskId, 'tags'])
    // của project. Kèm subtask lists vì subtask row cũng hiển thị nhãn.
    void qc.invalidateQueries(
      {
        predicate: (q) =>
          q.queryKey[0] === 'tasks' &&
          q.queryKey[1] === projectId &&
          q.queryKey[3] === 'tags',
      },
      { cancelRefetch: false },
    );
    invalidateSubtaskLists(qc, projectId);
  },

  // ── Tag gắn trên task: delta vào card (miss = subtask → bỏ qua) ──
  'task:tag-attached': (qc, projectId, p) => {
    const ev = p as TagAttachedEvent;
    boardDeltaSoft(qc, projectId, (b) => applyTagAttached(b, ev));
    if (isLocal(ev.taskId, 'task:tag-attached')) return;
    scheduleInvalidate(qc, subKey(projectId, ev.taskId, 'tags'));
    invalidateSubtaskLists(qc, projectId);
  },
  'task:tag-detached': (qc, projectId, p) => {
    const ev = p as { taskId: string; tagId: string };
    boardDeltaSoft(qc, projectId, (b) => applyTagDetached(b, ev));
    if (isLocal(ev.taskId, 'task:tag-detached')) return;
    scheduleInvalidate(qc, subKey(projectId, ev.taskId, 'tags'));
    invalidateSubtaskLists(qc, projectId);
  },

  // ── Comments: write-through list + bump count trên card ──
  'comment:created': (qc, projectId, p) => {
    const ev = p as Comment;
    listDelta<Comment>(qc, subKey(projectId, ev.taskId, 'comments'), (l) =>
      upsertById(l, ev, byCreatedAt),
    );
    boardDeltaSoft(qc, projectId, (b) => bumpTaskCount(b, ev.taskId, 'commentCount', 1));
    invalidateDetail(qc, projectId, ev.taskId);
    invalidateHistory(qc, projectId);
    invalidateFeed(qc);
  },
  'comment:updated': (qc, projectId, p) => {
    const ev = p as Comment;
    listDelta<Comment>(qc, subKey(projectId, ev.taskId, 'comments'), (l) =>
      upsertById(l, ev, byCreatedAt),
    );
  },
  'comment:deleted': (qc, projectId, p) => {
    const ev = p as CommentDeletedEvent;
    listDelta<Comment>(qc, subKey(projectId, ev.taskId, 'comments'), (l) =>
      removeById(l, ev.commentId),
    );
    boardDeltaSoft(qc, projectId, (b) => bumpTaskCount(b, ev.taskId, 'commentCount', -1));
    invalidateDetail(qc, projectId, ev.taskId);
    invalidateHistory(qc, projectId);
    invalidateFeed(qc);
  },

  // ── Checklist ──
  'checklist:added': (qc, projectId, p) => {
    const ev = p as ChecklistItem;
    const key = subKey(projectId, ev.taskId, 'checklist');
    const alreadyCached = qc.getQueryData<ChecklistItem[]>(key)?.some((item) => item.id === ev.id);
    listDelta<ChecklistItem>(qc, key, (l) =>
      upsertById(l, ev, byPosition),
    );
    if (!alreadyCached) {
      boardDeltaSoft(qc, projectId, (b) => bumpTaskCount(b, ev.taskId, 'checklistCount', 1));
    }
    if (isLocal(ev.taskId, 'checklist:added')) return;
    invalidateDetail(qc, projectId, ev.taskId);
    invalidateFeed(qc);
  },
  'checklist:updated': (qc, projectId, p) => {
    const ev = p as ChecklistItem;
    listDelta<ChecklistItem>(qc, subKey(projectId, ev.taskId, 'checklist'), (l) =>
      upsertById(l, ev, byPosition),
    );
    if (isLocal(ev.taskId, 'checklist:updated')) return;
  },
  'checklist:toggled': (qc, projectId, p) => {
    const ev = p as ChecklistToggledEvent;
    listDelta<ChecklistItem>(qc, subKey(projectId, ev.taskId, 'checklist'), (l) =>
      patchById(l, ev.itemId, { isDone: ev.isDone }),
    );
    if (isLocal(ev.taskId, 'checklist:toggled')) return;
    invalidateDetail(qc, projectId, ev.taskId); // checklistDone trên detail
    invalidateFeed(qc);
  },
  'checklist:deleted': (qc, projectId, p) => {
    const ev = p as { itemId: string; taskId: string };
    const key = subKey(projectId, ev.taskId, 'checklist');
    const wasCached = qc.getQueryData<ChecklistItem[]>(key)?.some((item) => item.id === ev.itemId);
    listDelta<ChecklistItem>(qc, key, (l) =>
      removeById(l, ev.itemId),
    );
    if (wasCached) {
      boardDeltaSoft(qc, projectId, (b) => bumpTaskCount(b, ev.taskId, 'checklistCount', -1));
    }
    if (isLocal(ev.taskId, 'checklist:deleted')) return;
    invalidateDetail(qc, projectId, ev.taskId);
    invalidateFeed(qc);
  },

  // ── Attachments (board card không hiển thị count → chỉ list + detail) ──
  'attachment:added': (qc, projectId, p) => {
    const ev = p as Attachment;
    listDelta<Attachment>(qc, subKey(projectId, ev.taskId, 'attachments'), (l) =>
      upsertById(l, ev, byCreatedAt),
    );
    invalidateFeed(qc);
  },
  'attachment:deleted': (qc, projectId, p) => {
    const ev = p as AttachmentDeletedEvent;
    listDelta<Attachment>(qc, subKey(projectId, ev.taskId, 'attachments'), (l) =>
      removeById(l, ev.attachmentId),
    );
    invalidateFeed(qc);
  },

  // ── Assignees: delta vào card; "Việc của tôi" chỉ khi liên quan chính mình ──
  'assignee:added': (qc, projectId, p) => {
    const ev = p as AssigneeEvent;
    boardDeltaSoft(qc, projectId, (b) =>
      applyAssigneeAdded(b, {
        taskId: ev.taskId,
        userId: ev.userId,
        displayName: ev.displayName ?? ev.userId,
        avatarUrl: ev.avatarUrl ?? null,
      }),
    );
    if (isLocal(ev.taskId, 'assignee:added')) return;
    scheduleInvalidate(qc, subKey(projectId, ev.taskId, 'assignees'));
    invalidateDetail(qc, projectId, ev.taskId);
    invalidateFeed(qc);
    invalidateReports(qc, projectId);
    if (ev.userId === getCurrentUser()?.userId) invalidateMyTasks(qc);
  },
  'assignee:removed': (qc, projectId, p) => {
    const ev = p as AssigneeEvent;
    boardDeltaSoft(qc, projectId, (b) => applyAssigneeRemoved(b, ev));
    if (isLocal(ev.taskId, 'assignee:removed')) return;
    scheduleInvalidate(qc, subKey(projectId, ev.taskId, 'assignees'));
    invalidateDetail(qc, projectId, ev.taskId);
    invalidateFeed(qc);
    invalidateReports(qc, projectId);
    if (ev.userId === getCurrentUser()?.userId) invalidateMyTasks(qc);
  },
};

// ── Hook ─────────────────────────────────────────────────────────────────────

/** Retry lấy socket khi token chưa sẵn sàng lúc mount (tránh realtime chết im lặng) */
const SOCKET_RETRY_MS = 1000;

/**
 * Realtime cho board/project đang mở: join room `project:{id}`, mọi event
 * từ thành viên khác được áp thẳng vào cache (delta) hoặc invalidate.
 * Mốc tuần tự lấy từ board snapshot trong cache; khi reconnect chỉ resync từ
 * mốc đó, còn nếu chưa có mốc thì invalidate board thay vì tải changes từ 0.
 */
export function useTaskRealtime(projectId: string | null): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let teardown: (() => void) | null = null;
    let lastSeq = 0;

    const syncSeqFromBoard = (): void => {
      const seq = qc.getQueryData<Board>(taskKeys.board(projectId))?.project.eventSeq ?? 0;
      if (seq > lastSeq) lastSeq = seq;
    };

    const unsubscribe = qc.getQueryCache().subscribe((event) => {
      if (
        event.type === 'updated'
        && event.action.type === 'success'
        && JSON.stringify(event.query.queryKey) === JSON.stringify(taskKeys.board(projectId))
      ) {
        syncSeqFromBoard();
      }
    });

    const applyChange = (type: string, payload: unknown, seq: number): void => {
      const handler = EVENT_HANDLERS[type];
      if (!handler || seq <= lastSeq) return;
      handler(qc, projectId, payload);
      lastSeq = seq;
    };

    const resync = async (): Promise<void> => {
      if (lastSeq === 0) {
        scheduleInvalidate(qc, taskKeys.board(projectId));
        return;
      }
      try {
        const response = await tasksApi.getChangesSince(projectId, lastSeq);
        if (disposed) return;
        if (response.resync) {
          scheduleInvalidate(qc, taskKeys.board(projectId));
          return;
        }
        for (const change of response.changes) {
          applyChange(change.type, change.payload, change.seq);
        }
      } catch (error) {
        logger.warn('Không thể resync task changes', { projectId, error });
        scheduleInvalidate(qc, taskKeys.board(projectId));
      }
    };

    const setup = (): void => {
      if (disposed) return;
      const socket = getTaskSocket();
      if (!socket) {
        // Token chưa sẵn sàng (vd: mount trước khi auth xong) → thử lại
        retryTimer = setTimeout(setup, SOCKET_RETRY_MS);
        return;
      }

      const handlers = new Map<string, (payload: unknown) => void>();
      for (const [event, handle] of Object.entries(EVENT_HANDLERS)) {
        const handler = (payload: unknown): void => {
          const seq =
            typeof payload === 'object' && payload !== null && 'seq' in payload
              ? Number((payload as { seq: unknown }).seq)
              : 0;
          if (seq > 0 && seq <= lastSeq) return;
          handle(qc, projectId, payload ?? {});
          if (seq > 0) lastSeq = seq;
        };
        handlers.set(event, handler);
        socket.on(event, handler);
      }

      const join = (): void => {
        socket.emit(
          'join-project',
          { projectId },
          (ack: { ok: boolean; error?: string }) => {
            if (!ack?.ok) {
              logger.warn('Task WS join-project bị từ chối', {
                projectId,
                error: ack?.error,
              });
            }
          },
        );
      };
      syncSeqFromBoard();
      join();

      // Sau reconnect: join lại room (server quên room cũ) và lấy các event
      // đã mất từ mốc của board snapshot gần nhất.
      const onReconnect = (): void => {
        join();
        void resync();
      };
      socket.on('connect', onReconnect);

      teardown = () => {
        socket.off('connect', onReconnect);
        for (const [event, handler] of handlers) socket.off(event, handler);
        socket.emit('leave-project', { projectId });
      };
    };

    setup();

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      unsubscribe();
      teardown?.();
    };
  }, [projectId, qc]);
}

/**
 * Warmup socket ngay khi vào khu vực tasks (kể cả chưa chọn project) — để lúc
 * mở board lần đầu đã có kết nối sẵn, không tốn handshake. Retry khi token
 * chưa sẵn sàng lúc mount.
 */
export function useTaskSocketWarmup(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const warm = (): void => {
      if (!getTaskSocket()) timer = setTimeout(warm, SOCKET_RETRY_MS);
    };
    warm();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);
}
