import { describe, expect, it } from 'vitest';
import { invalidationFor, REALTIME_EVENTS, toSignal } from '../lib/realtime-invalidation';
import { taskKeys } from '../services/keys';

const projectId = 'p1';
const ctx = { projectId, currentUserId: 'me' };
const board = taskKeys.board(projectId);
const aggregates = [
  ['tasks', 'my'],
  ['tasks', 'feed'],
  ['tasks', 'overview'],
  ['tasks', 'reports'],
  ['reports', 'insights'],
  ['tasks', projectId, 'stats'],
  ['tasks', projectId, 'leaderboard'],
];
const taskScope = (taskId: string) => [
  ['tasks', projectId, taskId],
  ['tasks', projectId, 'activities', taskId],
];

describe('toSignal', () => {
  it('nên lấy taskId và parentId từ payload.task khi payload cũ không có ở cấp gốc', () => {
    expect(toSignal({ task: { id: 't1', parentId: 'p9' }, seq: 3 })).toEqual({
      taskId: 't1',
      parentId: 'p9',
    });
  });

  it('nên giữ đúng các field của RealtimeSignal mới và bỏ field lạ', () => {
    expect(
      toSignal({ projectId, taskId: 't1', actorId: 'u1', userId: 'u2', seq: 9, task: {} }),
    ).toEqual({ projectId, taskId: 't1', actorId: 'u1', userId: 'u2' });
  });

  it('nên trả object rỗng khi payload không phải object', () => {
    expect(toSignal(null)).toEqual({});
    expect(toSignal('x')).toEqual({});
  });
});

describe('invalidationFor', () => {
  it('nên làm mới task, board và màn tổng hợp khi task:updated', () => {
    const r = invalidationFor('task:updated', { taskId: 't1' }, ctx);
    expect(r.keys).toEqual([...taskScope('t1'), board, ...aggregates]);
    expect(r.subtaskLists).toBe(true);
  });

  it('nên làm mới cả task cha khi tín hiệu có parentId', () => {
    const r = invalidationFor('subtask:created', { taskId: 's1', parentId: 't1' }, ctx);
    expect(r.keys).toEqual(
      expect.arrayContaining([['tasks', projectId, 's1'], ['tasks', projectId, 't1'], board]),
    );
  });

  it.each([
    'comment:updated',
    'checklist:updated',
    'checklist:toggled',
    'attachment:added',
    'attachment:deleted',
  ] as const)(
    'nên KHÔNG làm mới board và màn tổng hợp khi %s',
    (event) => {
      const r = invalidationFor(event, { taskId: 't1' }, ctx);
      expect(r.keys).toEqual(taskScope('t1'));
      expect(r.subtaskLists).toBe(true);
    },
  );

  it('nên chỉ làm mới board khi task:created thiếu taskId (payload BE cũ)', () => {
    const r = invalidationFor('task:created', {}, ctx);
    expect(r.keys).toEqual([board, ...aggregates]);
    expect(r.subtaskLists).toBe(false);
  });

  it.each([
    'column:created',
    'column:updated',
    'column:deleted',
    'board:locked',
    'board:unlocked',
  ] as const)(
    'nên làm mới board khi %s',
    (event) => {
      expect(invalidationFor(event, {}, ctx).keys).toEqual([board, ...aggregates]);
    },
  );

  it('nên làm mới board và danh sách project khi project:updated', () => {
    expect(invalidationFor('project:updated', {}, ctx).keys).toEqual([
      board,
      taskKeys.projects(),
      ...aggregates,
    ]);
  });

  it('nên làm mới board và danh sách project khi project:deleted', () => {
    expect(invalidationFor('project:deleted', {}, ctx).keys).toEqual([
      board,
      taskKeys.projects(),
      ...aggregates,
    ]);
  });

  it('nên làm mới tags và board khi tag:deleted', () => {
    expect(invalidationFor('tag:deleted', {}, ctx).keys).toEqual([
      board,
      ['tasks', projectId, 'tags'],
      ...aggregates,
    ]);
  });

  it('nên làm mới members và board khi member:added', () => {
    expect(invalidationFor('member:added', {}, ctx).keys).toEqual([
      board,
      ['tasks', projectId, 'members'],
      ...aggregates,
    ]);
  });

  it('nên làm mới thêm danh sách project khi chính mình bị xoá khỏi project', () => {
    expect(invalidationFor('member:removed', { userId: 'me' }, ctx).keys).toEqual([
      board,
      ['tasks', projectId, 'members'],
      taskKeys.projects(),
      ...aggregates,
    ]);
  });

  it('nên không làm mới danh sách project khi người khác bị xoá', () => {
    expect(invalidationFor('member:removed', { userId: 'other' }, ctx).keys).not.toContainEqual(
      taskKeys.projects(),
    );
  });

  it('nên chỉ làm mới join-requests khi join-request:created', () => {
    expect(invalidationFor('join-request:created', {}, ctx)).toEqual({
      keys: [['tasks', projectId, 'join-requests']],
      subtaskLists: false,
    });
  });

  it('nên có ánh xạ cho đủ 33 event đồng bộ mà BE phát', () => {
    expect(REALTIME_EVENTS).toHaveLength(33);
    for (const event of REALTIME_EVENTS) {
      expect(() => invalidationFor(event, { taskId: 't1' }, ctx)).not.toThrow();
    }
  });
});
