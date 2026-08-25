import { getJSON, setJSON } from '@/lib/storage/local-storage';

const STORAGE_KEY = 'halo-notes-recent-pages';
const MAX_RECENT_PAGES = 10;

export interface RecentPage {
  pageId: string;
  workspaceId: string;
  title: string;
  icon: string | null;
  visitedAt: string;
}

/** Trang gần đây của một workspace, mới nhất trước — không lọc trang còn
 * sống ở đây, việc đó cần dữ liệu API mà lib thuần này không có. */
export function getRecentPages(workspaceId: string): RecentPage[] {
  return getJSON<RecentPage[]>(STORAGE_KEY, [])
    .filter((page) => page.workspaceId === workspaceId);
}

/** Ghi nhận một lượt mở trang — đẩy lên đầu, bỏ trùng, giữ tối đa 10 mục
 * tính trên toàn bộ (mọi workspace), khớp đúng "10 mục gần nhất" ở plan. */
export function recordRecentPage(page: {
  id: string;
  workspaceId: string;
  title: string;
  icon: string | null;
}): void {
  const all = getJSON<RecentPage[]>(STORAGE_KEY, []);
  const next: RecentPage[] = [
    {
      pageId: page.id,
      workspaceId: page.workspaceId,
      title: page.title,
      icon: page.icon,
      visitedAt: new Date().toISOString(),
    },
    ...all.filter((entry) => entry.pageId !== page.id),
  ].slice(0, MAX_RECENT_PAGES);
  setJSON(STORAGE_KEY, next);
}
