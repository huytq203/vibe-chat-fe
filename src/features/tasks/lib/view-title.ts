import type { ActiveView } from '../stores/tasks-ui.store';
import type { Project } from '../types';

function greeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Chào buổi sáng';
  if (h >= 12 && h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

export function getViewTitle(
  activeView: ActiveView,
  project?: Project,
): { title: string; sub: string } {
  switch (activeView) {
    case 'home':
      return { title: 'Trang chủ', sub: greeting() };
    case 'projects':
      return { title: 'Dự án', sub: 'Tổng quan tất cả dự án' };
    case 'reports':
      return { title: 'Báo cáo', sub: 'Thống kê & phân tích' };
    case 'board':
      return {
        title: project?.name ?? 'Nhiệm vụ',
        sub: project?.description ?? 'Board dự án',
      };
  }
}
