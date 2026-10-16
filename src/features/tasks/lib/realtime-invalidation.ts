import type { QueryKey } from '@tanstack/react-query';
import { taskKeys } from '../services/keys';
import type { RealtimeSignal } from '../types';

/** Event làm thay đổi field của thẻ trên board → làm mới task + board. */
const TASK_CARD_EVENTS = [
  'task:created',
  'task:updated',
  'task:moved',
  'task:deleted',
  'subtask:created',
  'subtask:deleted',
  'task:tag-attached',
  'task:tag-detached',
  'assignee:added',
  'assignee:removed',
  'comment:created',
  'comment:deleted',
  'checklist:added',
  'checklist:deleted',
] as const;

/** Event chỉ đổi phần chi tiết task (thẻ board không hiển thị) → không làm mới board. */
const TASK_DETAIL_EVENTS = [
  'comment:updated',
  'checklist:updated',
  'checklist:toggled',
  'attachment:added',
  'attachment:deleted',
] as const;

const PROJECT_EVENTS = [
  'column:created',
  'column:updated',
  'column:deleted',
  'board:locked',
  'board:unlocked',
  'project:updated',
  'project:deleted',
  'tag:created',
  'tag:updated',
  'tag:deleted',
  'member:added',
  'member:removed',
  'join-request:created',
  'join-request:updated',
] as const;

export const REALTIME_EVENTS = [
  ...TASK_CARD_EVENTS,
  ...TASK_DETAIL_EVENTS,
  ...PROJECT_EVENTS,
] as const;

export type RealtimeEvent = (typeof REALTIME_EVENTS)[number];

export interface Invalidation {
  keys: QueryKey[];
  /** true → làm mới thêm mọi danh sách subtask đang có trong cache của project. */
  subtaskLists: boolean;
}

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value ? value : undefined;

/** Chuẩn hoá payload socket (mới hoặc cũ) về RealtimeSignal, bỏ mọi field khác. */
export function toSignal(payload: unknown): RealtimeSignal {
  if (typeof payload !== 'object' || payload === null) return {};
  const p = payload as Record<string, unknown>;
  const task =
    typeof p.task === 'object' && p.task !== null ? (p.task as Record<string, unknown>) : {};
  const signal: RealtimeSignal = {};
  const projectId = asString(p.projectId);
  const taskId = asString(p.taskId) ?? asString(task.id);
  const parentId = asString(p.parentId) ?? asString(task.parentId);
  const actorId = asString(p.actorId);
  const userId = asString(p.userId);
  if (projectId) signal.projectId = projectId;
  if (taskId) signal.taskId = taskId;
  if (parentId) signal.parentId = parentId;
  if (actorId) signal.actorId = actorId;
  if (userId) signal.userId = userId;
  return signal;
}

const isOneOf = <T extends string>(list: readonly T[], value: string): value is T =>
  (list as readonly string[]).includes(value);

function aggregateKeys(projectId: string): QueryKey[] {
  return [
    ['tasks', 'my'],
    ['tasks', 'feed'],
    ['tasks', 'overview'],
    ['tasks', 'reports'],
    ['reports', 'insights'],
    ['tasks', projectId, 'stats'],
    ['tasks', projectId, 'leaderboard'],
  ];
}

function taskScopeKeys(projectId: string, signal: RealtimeSignal): QueryKey[] {
  const keys: QueryKey[] = [];
  if (signal.taskId) {
    keys.push(
      ['tasks', projectId, signal.taskId],
      ['tasks', projectId, 'activities', signal.taskId],
    );
  }
  if (signal.parentId) keys.push(['tasks', projectId, signal.parentId]);
  return keys;
}

function projectExtraKeys(
  event: RealtimeEvent,
  signal: RealtimeSignal,
  ctx: { projectId: string; currentUserId: string | null },
): QueryKey[] {
  if (event === 'project:updated' || event === 'project:deleted') return [taskKeys.projects()];
  if (event.startsWith('tag:')) return [['tasks', ctx.projectId, 'tags']];
  if (event === 'member:added') return [['tasks', ctx.projectId, 'members']];
  if (event === 'member:removed') {
    const members: QueryKey = ['tasks', ctx.projectId, 'members'];
    // Chính mình bị xoá → danh sách project đổi, board sẽ trả 403 khi refetch
    return signal.userId && signal.userId === ctx.currentUserId
      ? [members, taskKeys.projects()]
      : [members];
  }
  return [];
}

/** Query key cần invalidate cho một tín hiệu realtime (spec mục 5.2). */
export function invalidationFor(
  event: RealtimeEvent,
  signal: RealtimeSignal,
  ctx: { projectId: string; currentUserId: string | null },
): Invalidation {
  const { projectId } = ctx;
  if (event === 'join-request:created' || event === 'join-request:updated') {
    return { keys: [['tasks', projectId, 'join-requests']], subtaskLists: false };
  }
  if (isOneOf(TASK_DETAIL_EVENTS, event)) {
    return { keys: taskScopeKeys(projectId, signal), subtaskLists: true };
  }
  if (isOneOf(TASK_CARD_EVENTS, event)) {
    return {
      keys: [
        ...taskScopeKeys(projectId, signal),
        taskKeys.board(projectId),
        ...aggregateKeys(projectId),
      ],
      subtaskLists: Boolean(signal.taskId),
    };
  }
  return {
    keys: [
      taskKeys.board(projectId),
      ...projectExtraKeys(event, signal, ctx),
      ...aggregateKeys(projectId),
    ],
    subtaskLists: false,
  };
}
