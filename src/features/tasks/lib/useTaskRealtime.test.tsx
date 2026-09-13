import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { taskKeys } from '../services/keys';
import { markLocal } from './local-mutations';
import type { Board, TaskDetail } from '../types';

type SocketHandler = (payload: unknown) => void;

const socketHandlers = new Map<string, SocketHandler>();
const socket = {
  on: vi.fn((event: string, handler: SocketHandler) => {
    socketHandlers.set(event, handler);
  }),
  off: vi.fn(),
  emit: vi.fn(),
};

vi.mock('./task-socket', () => ({
  getTaskSocket: () => socket,
}));

vi.mock('../services/tasks.api', () => ({
  tasksApi: {
    getChangesSince: vi.fn().mockResolvedValue({ resync: false, changes: [] }),
  },
}));

import { useTaskRealtime } from '../hooks/useTaskRealtime';

const projectId = 'project-realtime';
const taskId = 'task-realtime';

function createBoard(): Board {
  return {
    project: {
      id: projectId,
      name: 'Dự án',
      ownerId: 'owner-1',
      isBoardLocked: false,
      status: 'ACTIVE',
      isOverdue: false,
      startDate: null,
      endDate: null,
      createdAt: '2026-09-13T00:00:00.000Z',
      updatedAt: '2026-09-13T00:00:00.000Z',
    },
    columns: [{
      id: 'column-1',
      name: 'Đang làm',
      color: null,
      position: 0,
      isDoneCol: false,
      tasks: [],
    }],
  };
}

function createTask(): TaskDetail {
  return {
    id: taskId,
    version: 2,
    projectId,
    columnId: 'column-1',
    title: 'Việc đã cập nhật',
    description: null,
    dueDate: null,
    priority: null,
    gem: null,
    gemSource: null,
    isPinned: false,
    position: 0,
    assigneeCount: 0,
    commentCount: 0,
    checklistTotal: 0,
    checklistDone: 0,
    completedAt: null,
    reviewRequestedAt: null,
    reviewRequestedBy: null,
    status: 'OPEN',
    parentId: null,
    subtaskCount: 0,
    tags: [],
    createdAt: '2026-09-13T00:00:00.000Z',
    updatedAt: '2026-09-13T00:00:00.000Z',
  };
}

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('realtime task chống bão request', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    socketHandlers.clear();
    socket.on.mockClear();
    socket.off.mockClear();
    socket.emit.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('gom năm sự kiện cập nhật liên tiếp thành tối đa một invalidate board', async () => {
    const client = new QueryClient();
    client.setQueryData(taskKeys.board(projectId), createBoard());
    const invalidateQueries = vi.spyOn(client, 'invalidateQueries');
    renderHook(() => useTaskRealtime(projectId), { wrapper: createWrapper(client) });

    const handle = socketHandlers.get('task:updated');
    expect(handle).toBeDefined();
    act(() => {
      for (let index = 0; index < 5; index += 1) {
        handle?.({ taskId, changes: { title: `Việc ${index}` } });
      }
    });
    await act(() => vi.advanceTimersByTimeAsync(400));

    const boardCalls = invalidateQueries.mock.calls.filter(
      ([filters]) => JSON.stringify(filters?.queryKey) === JSON.stringify(taskKeys.board(projectId)),
    );
    expect(boardCalls.length).toBeLessThanOrEqual(1);
  });

  it('không invalidate sự kiện do chính client vừa gây ra', async () => {
    const localTaskId = 'task-local';
    const client = new QueryClient();
    client.setQueryData(taskKeys.board(projectId), createBoard());
    const invalidateQueries = vi.spyOn(client, 'invalidateQueries');
    renderHook(() => useTaskRealtime(projectId), { wrapper: createWrapper(client) });
    markLocal(localTaskId, 'task:updated');

    act(() => {
      socketHandlers.get('task:updated')?.({ taskId: localTaskId, changes: { title: 'Cục bộ' } });
    });
    await act(() => vi.advanceTimersByTimeAsync(400));

    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it('vá board và detail từ payload task mà không invalidate hai cache này', async () => {
    const client = new QueryClient();
    client.setQueryData(taskKeys.board(projectId), createBoard());
    const setQueryData = vi.spyOn(client, 'setQueryData');
    const invalidateQueries = vi.spyOn(client, 'invalidateQueries');
    renderHook(() => useTaskRealtime(projectId), { wrapper: createWrapper(client) });

    act(() => {
      socketHandlers.get('task:updated')?.({
        taskId,
        changes: { title: 'Delta cũ' },
        task: createTask(),
      });
    });
    await act(() => vi.advanceTimersByTimeAsync(400));

    expect(setQueryData).toHaveBeenCalledWith(
      ['tasks', projectId, taskId, 'detail'],
      expect.objectContaining({ id: taskId, title: 'Việc đã cập nhật' }),
    );
    const protectedCalls = invalidateQueries.mock.calls.filter(([filters]) => {
      const key = JSON.stringify(filters?.queryKey);
      return key === JSON.stringify(taskKeys.board(projectId))
        || key === JSON.stringify(['tasks', projectId, taskId, 'detail']);
    });
    expect(protectedCalls).toHaveLength(0);
  });
});
