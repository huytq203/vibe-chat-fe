import { describe, it, expect } from 'vitest';
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
import type { Board, BoardTask } from '../types';

function task(id: string, columnId: string, position: number, extra?: Partial<BoardTask>): BoardTask {
  return {
    id,
    columnId,
    title: `Task ${id}`,
    position,
    isPinned: false,
    priority: null,
    dueDate: null,
    tags: [],
    assignees: [],
    checklistCount: 0,
    commentCount: 0,
    completedAt: null,
    reviewRequestedAt: null,
    status: 'OPEN',
    ...extra,
  };
}

function makeBoard(): Board {
  return {
    project: {} as never,
    columns: [
      {
        id: 'col-todo',
        name: 'Todo',
        color: null,
        position: 0,
        isDoneCol: false,
        tasks: [task('t1', 'col-todo', 1000), task('t2', 'col-todo', 2000)],
      },
      {
        id: 'col-done',
        name: 'Done',
        color: null,
        position: 1,
        isDoneCol: true,
        tasks: [task('t3', 'col-done', 1000)],
      },
    ],
  };
}

describe('applyTaskMoved', () => {
  it('chuyển task sang cột khác đúng vị trí và cập nhật columnId', () => {
    const next = applyTaskMoved(makeBoard(), { taskId: 't1', columnId: 'col-done', position: 500 });
    expect(next).not.toBeNull();
    const todo = next!.columns.find((c) => c.id === 'col-todo')!;
    const done = next!.columns.find((c) => c.id === 'col-done')!;
    expect(todo.tasks.map((t) => t.id)).toEqual(['t2']);
    expect(done.tasks.map((t) => t.id)).toEqual(['t1', 't3']);
    expect(done.tasks[0].columnId).toBe('col-done');
    expect(done.tasks[0].position).toBe(500);
  });

  it('đổi vị trí trong cùng cột giữ đúng thứ tự position tăng dần', () => {
    const next = applyTaskMoved(makeBoard(), { taskId: 't1', columnId: 'col-todo', position: 3000 });
    const todo = next!.columns.find((c) => c.id === 'col-todo')!;
    expect(todo.tasks.map((t) => t.id)).toEqual(['t2', 't1']);
  });

  it('giữ position cũ khi payload thiếu position', () => {
    const next = applyTaskMoved(makeBoard(), { taskId: 't2', columnId: 'col-done' });
    const done = next!.columns.find((c) => c.id === 'col-done')!;
    expect(done.tasks.find((t) => t.id === 't2')!.position).toBe(2000);
  });

  it('trả null khi task không có trong board (caller fallback invalidate)', () => {
    expect(applyTaskMoved(makeBoard(), { taskId: 'missing', columnId: 'col-done' })).toBeNull();
  });

  it('trả null khi cột đích không tồn tại', () => {
    expect(applyTaskMoved(makeBoard(), { taskId: 't1', columnId: 'missing' })).toBeNull();
  });

  it('không mutate board gốc', () => {
    const board = makeBoard();
    applyTaskMoved(board, { taskId: 't1', columnId: 'col-done', position: 500 });
    expect(board.columns[0].tasks.map((t) => t.id)).toEqual(['t1', 't2']);
    expect(board.columns[1].tasks.map((t) => t.id)).toEqual(['t3']);
  });
});

describe('applyTaskUpdated', () => {
  it('merge các field scalar được whitelist vào đúng task', () => {
    const next = applyTaskUpdated(makeBoard(), {
      taskId: 't1',
      changes: { title: 'Mới', priority: 'P1', isPinned: true, dueDate: '2026-07-10T00:00:00.000Z' },
    });
    const t1 = next!.columns[0].tasks[0];
    expect(t1.title).toBe('Mới');
    expect(t1.priority).toBe('P1');
    expect(t1.isPinned).toBe(true);
    expect(t1.dueDate).toBe('2026-07-10T00:00:00.000Z');
  });

  it('áp thay đổi workflow (completedAt/status) từ emitWorkflowChange', () => {
    const next = applyTaskUpdated(makeBoard(), {
      taskId: 't1',
      changes: { completedAt: '2026-07-02T08:00:00.000Z', status: 'DONE' },
    });
    const t1 = next!.columns[0].tasks[0];
    expect(t1.completedAt).toBe('2026-07-02T08:00:00.000Z');
    expect(t1.status).toBe('DONE');
  });

  it('bỏ qua field không thuộc BoardTask (description) — không làm bẩn cache', () => {
    const next = applyTaskUpdated(makeBoard(), {
      taskId: 't1',
      changes: { description: 'nội dung dài' },
    });
    expect(next).not.toBeNull();
    expect('description' in next!.columns[0].tasks[0]).toBe(false);
  });

  it('changes rỗng → trả board không đổi (không cần refetch)', () => {
    const board = makeBoard();
    expect(applyTaskUpdated(board, { taskId: 't1', changes: {} })).not.toBeNull();
  });

  it('trả null khi task không có trong board', () => {
    expect(applyTaskUpdated(makeBoard(), { taskId: 'missing', changes: { title: 'x' } })).toBeNull();
  });
});

describe('applyTaskCreated', () => {
  it('payload thiếu → trả null để caller refetch thay vì crash', () => {
    expect(applyTaskCreated(makeBoard(), undefined)).toBeNull();
  });

  it('chèn task mới vào đúng cột theo position với defaults rỗng', () => {
    const next = applyTaskCreated(makeBoard(), {
      id: 'new',
      columnId: 'col-todo',
      title: 'Task mới',
      position: 1500,
      isPinned: false,
      status: 'OPEN',
    });
    const todo = next!.columns.find((c) => c.id === 'col-todo')!;
    expect(todo.tasks.map((t) => t.id)).toEqual(['t1', 'new', 't2']);
    const created = todo.tasks[1];
    expect(created.tags).toEqual([]);
    expect(created.assignees).toEqual([]);
    expect(created.checklistCount).toBe(0);
    expect(created.commentCount).toBe(0);
    expect(created.priority).toBeNull();
    expect(created.dueDate).toBeNull();
  });

  it('thay thế thay vì nhân đôi khi task đã có trong board (event của chính mình)', () => {
    const next = applyTaskCreated(makeBoard(), {
      id: 't1',
      columnId: 'col-todo',
      title: 'Đổi tên',
      position: 1000,
      isPinned: false,
      status: 'OPEN',
    });
    const todo = next!.columns.find((c) => c.id === 'col-todo')!;
    expect(todo.tasks.filter((t) => t.id === 't1')).toHaveLength(1);
    expect(todo.tasks.find((t) => t.id === 't1')!.title).toBe('Đổi tên');
  });

  it('bỏ qua subtask (parentId khác null) — board chỉ hiển thị task cấp cao nhất', () => {
    const board = makeBoard();
    const next = applyTaskCreated(board, {
      id: 'sub',
      columnId: 'col-todo',
      title: 'Subtask',
      position: 9000,
      isPinned: false,
      status: 'OPEN',
      parentId: 't1',
    });
    expect(next!.columns[0].tasks.map((t) => t.id)).toEqual(['t1', 't2']);
  });

  it('trả null khi cột không tồn tại', () => {
    expect(
      applyTaskCreated(makeBoard(), {
        id: 'new',
        columnId: 'missing',
        title: 'x',
        position: 1,
        isPinned: false,
        status: 'OPEN',
      }),
    ).toBeNull();
  });
});

describe('applyTaskDeleted', () => {
  it('xoá task khỏi board', () => {
    const next = applyTaskDeleted(makeBoard(), { taskId: 't2' });
    expect(next!.columns[0].tasks.map((t) => t.id)).toEqual(['t1']);
  });

  it('task không có trong board → trả board không đổi (subtask không render)', () => {
    const next = applyTaskDeleted(makeBoard(), { taskId: 'missing' });
    expect(next).not.toBeNull();
    expect(next!.columns[0].tasks).toHaveLength(2);
  });
});

describe('applyColumnCreated', () => {
  it('thêm cột mới với tasks rỗng, đúng thứ tự position', () => {
    const next = applyColumnCreated(makeBoard(), {
      id: 'col-mid',
      name: 'Doing',
      color: '#f00',
      position: 0.5,
      isDoneCol: false,
    });
    expect(next!.columns.map((c) => c.id)).toEqual(['col-todo', 'col-mid', 'col-done']);
    expect(next!.columns[1].tasks).toEqual([]);
  });

  it('không nhân đôi khi cột đã tồn tại', () => {
    const next = applyColumnCreated(makeBoard(), {
      id: 'col-todo',
      name: 'Todo',
      color: null,
      position: 0,
      isDoneCol: false,
    });
    expect(next!.columns).toHaveLength(2);
    // Cột cũ giữ nguyên tasks — không bị thay bằng cột rỗng
    expect(next!.columns.find((c) => c.id === 'col-todo')!.tasks).toHaveLength(2);
  });
});

describe('applyColumnUpdated', () => {
  it('merge name/color vào đúng cột', () => {
    const next = applyColumnUpdated(makeBoard(), {
      columnId: 'col-todo',
      changes: { name: 'Backlog', color: '#00f' },
    });
    expect(next!.columns[0].name).toBe('Backlog');
    expect(next!.columns[0].color).toBe('#00f');
  });

  it('trả null khi cột không tồn tại', () => {
    expect(applyColumnUpdated(makeBoard(), { columnId: 'missing', changes: { name: 'x' } })).toBeNull();
  });
});

describe('applyColumnDeleted', () => {
  it('xoá cột khỏi board', () => {
    const next = applyColumnDeleted(makeBoard(), { columnId: 'col-todo' });
    expect(next!.columns.map((c) => c.id)).toEqual(['col-done']);
  });
});

describe('bumpTaskCount', () => {
  it('tăng commentCount trên đúng task khi comment:created', () => {
    const next = bumpTaskCount(makeBoard(), 't1', 'commentCount', 1);
    expect(next!.columns[0].tasks[0].commentCount).toBe(1);
    expect(next!.columns[0].tasks[1].commentCount).toBe(0);
  });

  it('giảm checklistCount nhưng không âm', () => {
    const next = bumpTaskCount(makeBoard(), 't1', 'checklistCount', -1);
    expect(next!.columns[0].tasks[0].checklistCount).toBe(0);
  });

  it('trả null khi task không có trong board', () => {
    expect(bumpTaskCount(makeBoard(), 'missing', 'commentCount', 1)).toBeNull();
  });
});

describe('applyAssigneeAdded / applyAssigneeRemoved', () => {
  const assignee = { userId: 'u1', displayName: 'Huy', avatarUrl: null };

  it('thêm assignee vào card, dedupe theo userId', () => {
    const once = applyAssigneeAdded(makeBoard(), { taskId: 't1', ...assignee });
    const twice = applyAssigneeAdded(once!, { taskId: 't1', ...assignee });
    expect(twice!.columns[0].tasks[0].assignees).toHaveLength(1);
    expect(twice!.columns[0].tasks[0].assignees[0].displayName).toBe('Huy');
  });

  it('gỡ assignee khỏi card theo userId', () => {
    const added = applyAssigneeAdded(makeBoard(), { taskId: 't1', ...assignee });
    const removed = applyAssigneeRemoved(added!, { taskId: 't1', userId: 'u1' });
    expect(removed!.columns[0].tasks[0].assignees).toEqual([]);
  });

  it('trả null khi task không có trong board', () => {
    expect(applyAssigneeAdded(makeBoard(), { taskId: 'missing', ...assignee })).toBeNull();
    expect(applyAssigneeRemoved(makeBoard(), { taskId: 'missing', userId: 'u1' })).toBeNull();
  });
});

describe('applyTagAttached / applyTagDetached', () => {
  const tag = { id: 'tag1', name: 'Bug', color: '#f00' };

  it('gắn tag vào card, dedupe theo id', () => {
    const once = applyTagAttached(makeBoard(), { taskId: 't1', tag });
    const twice = applyTagAttached(once!, { taskId: 't1', tag });
    expect(twice!.columns[0].tasks[0].tags).toHaveLength(1);
    expect(twice!.columns[0].tasks[0].tags[0].name).toBe('Bug');
  });

  it('gỡ tag khỏi card theo tagId', () => {
    const added = applyTagAttached(makeBoard(), { taskId: 't1', tag });
    const removed = applyTagDetached(added!, { taskId: 't1', tagId: 'tag1' });
    expect(removed!.columns[0].tasks[0].tags).toEqual([]);
  });

  it('trả null khi task không có trong board', () => {
    expect(applyTagAttached(makeBoard(), { taskId: 'missing', tag })).toBeNull();
  });
});
