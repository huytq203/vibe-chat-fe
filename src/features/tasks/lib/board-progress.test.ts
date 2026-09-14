import { describe, expect, it } from 'vitest';
import { progressFromStats } from './board-progress';
import type { ProjectStats } from '../types';

describe('progressFromStats', () => {
  it('trả tiến độ rỗng khi chưa có thống kê', () => {
    expect(progressFromStats(undefined)).toEqual({ total: 0, done: 0, open: 0, pct: 0 });
  });

  it('ánh xạ thống kê project sang tiến độ board', () => {
    const stats: ProjectStats = {
      projectId: 'project-1',
      projectName: 'Dự án mẫu',
      totalTasks: 8,
      completedTasks: 3,
      inProgressTasks: 4,
      overdueTasks: 1,
      completionRate: 37.5,
    };

    expect(progressFromStats(stats)).toEqual({ total: 8, done: 3, open: 5, pct: 37.5 });
  });
});
