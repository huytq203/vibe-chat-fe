import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { taskKeys } from '../services/keys';
import { markLocal } from './local-mutations';

type SocketHandler = (payload?: unknown) => void;

const socketHandlers = new Map<string, SocketHandler>();
const socket = {
  on: vi.fn((event: string, handler: SocketHandler) => {
    socketHandlers.set(event, handler);
  }),
  off: vi.fn(),
  emit: vi.fn(),
};

vi.mock('./task-socket', () => ({ getTaskSocket: () => socket }));
vi.mock('./current-user', () => ({ getCurrentUser: () => ({ userId: 'me' }) }));

import { useTaskRealtime } from '../hooks/useTaskRealtime';

const projectId = 'project-realtime';
const FLUSH_MS = 400;

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  renderHook(() => useTaskRealtime(projectId), { wrapper });
  invalidate.mockClear();
  return { qc, invalidate };
}

const fire = (event: string, payload?: unknown): void => {
  const handler = socketHandlers.get(event);
  if (!handler) throw new Error(`Chưa đăng ký handler cho ${event}`);
  act(() => handler(payload));
};

const flush = (): void => {
  act(() => {
    vi.advanceTimersByTime(FLUSH_MS);
  });
};

const invalidatedKeys = (invalidate: ReturnType<typeof setup>['invalidate']): unknown[] =>
  invalidate.mock.calls.map(([filters]) => (filters as { queryKey: unknown }).queryKey);

describe('useTaskRealtime (tín hiệu + invalidate)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    socketHandlers.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('nên join project room khi mount', () => {
    setup();
    expect(socket.emit).toHaveBeenCalledWith('join-project', { projectId }, expect.any(Function));
  });

  it('nên invalidate task, activity và board khi task:updated', () => {
    const { invalidate } = setup();
    fire('task:updated', { projectId, taskId: 't1', actorId: 'other' });
    flush();
    const keys = invalidatedKeys(invalidate);
    expect(keys).toContainEqual(['tasks', projectId, 't1']);
    expect(keys).toContainEqual(['tasks', projectId, 'activities', 't1']);
    expect(keys).toContainEqual(taskKeys.board(projectId));
  });

  it('nên không invalidate board khi checklist:toggled', () => {
    const { invalidate } = setup();
    fire('checklist:toggled', { projectId, taskId: 't1', actorId: 'other' });
    flush();
    const keys = invalidatedKeys(invalidate);
    expect(keys).toContainEqual(['tasks', projectId, 't1']);
    expect(keys).not.toContainEqual(taskKeys.board(projectId));
  });

  it('nên bỏ qua tín hiệu của project khác', () => {
    const { invalidate } = setup();
    fire('task:updated', { projectId: 'project-khac', taskId: 't1', actorId: 'other' });
    flush();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('nên vẫn làm mới board khi payload cũ thiếu projectId', () => {
    const { invalidate } = setup();
    fire('column:created', { column: { id: 'c1' }, seq: 3 });
    flush();
    expect(invalidatedKeys(invalidate)).toContainEqual(taskKeys.board(projectId));
  });

  it('nên invalidate board đúng một lần khi nhận năm tín hiệu liên tiếp', () => {
    const { invalidate } = setup();
    for (let i = 0; i < 5; i += 1) {
      fire('task:moved', { projectId, taskId: `t${i}`, actorId: 'other' });
    }
    flush();
    const boardCalls = invalidatedKeys(invalidate).filter(
      (key) => JSON.stringify(key) === JSON.stringify(taskKeys.board(projectId)),
    );
    expect(boardCalls).toHaveLength(1);
  });

  it('nên bỏ qua tín hiệu do chính tab này vừa gây ra', () => {
    const { invalidate } = setup();
    markLocal('t1', 'task:updated');
    fire('task:updated', { projectId, taskId: 't1', actorId: 'me' });
    flush();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('nên invalidate danh sách subtask đang có trong cache khi tín hiệu thuộc task', () => {
    const { qc, invalidate } = setup();
    qc.setQueryData(['tasks', projectId, 'parent-1', 'subtasks'], []);
    fire('assignee:added', { projectId, taskId: 'sub-1', actorId: 'other' });
    flush();
    expect(invalidatedKeys(invalidate)).toContainEqual(['tasks', projectId, 'parent-1', 'subtasks']);
  });

  it('nên invalidate toàn bộ cache tasks khi socket kết nối lại', () => {
    const { invalidate } = setup();
    fire('connect');
    flush();
    expect(invalidatedKeys(invalidate)).toContainEqual(taskKeys.all);
    expect(socket.emit).toHaveBeenCalledWith('join-project', { projectId }, expect.any(Function));
  });

  it('nên invalidate danh sách project khi chính mình bị xoá khỏi project', () => {
    const { invalidate } = setup();
    fire('member:removed', { projectId, userId: 'me', actorId: 'owner' });
    flush();
    expect(invalidatedKeys(invalidate)).toContainEqual(taskKeys.projects());
  });
});
