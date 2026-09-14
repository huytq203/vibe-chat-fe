import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import type { TaskDetail } from '../types';
import { seedFromDetail } from './detail-seed';

const projectId = 'project-1';
const taskId = 'task-1';

describe('seed query con từ task detail', () => {
  it('trả dữ liệu ban đầu và thời điểm cập nhật khi detail đã có trong cache', () => {
    const queryClient = new QueryClient();
    const detail = {
      id: taskId,
      tags: [{ id: 'tag-1', name: 'Quan trọng' }],
    } as TaskDetail;

    queryClient.setQueryData(['tasks', projectId, taskId, 'detail'], detail, {
      updatedAt: 123_456,
    });

    expect(seedFromDetail(queryClient, projectId, taskId, (data) => data.tags)).toEqual({
      initialData: detail.tags,
      initialDataUpdatedAt: 123_456,
    });
  });

  it('trả object rỗng khi detail chưa có trong cache', () => {
    const queryClient = new QueryClient();

    expect(seedFromDetail(queryClient, projectId, taskId, (data) => data.tags)).toEqual({});
  });
});
