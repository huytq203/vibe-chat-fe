import { afterEach, describe, expect, it } from 'vitest';
import { getRecentPages, recordRecentPage } from './recent-pages';

afterEach(() => localStorage.clear());

describe('trang gần đây', () => {
  it('rỗng khi chưa ghi nhận gì', () => {
    expect(getRecentPages('workspace-1')).toEqual([]);
  });

  it('ghi nhận và trả về theo đúng workspace', () => {
    recordRecentPage({ id: 'page-1', workspaceId: 'workspace-1', title: 'Trang A', icon: null });
    recordRecentPage({ id: 'page-2', workspaceId: 'workspace-2', title: 'Trang B', icon: '📄' });

    expect(getRecentPages('workspace-1')).toHaveLength(1);
    expect(getRecentPages('workspace-1')[0]).toMatchObject({ pageId: 'page-1', title: 'Trang A' });
    expect(getRecentPages('workspace-2')).toHaveLength(1);
  });

  it('mở lại một trang đã có thì đẩy lên đầu, không nhân đôi', () => {
    recordRecentPage({ id: 'page-1', workspaceId: 'workspace-1', title: 'A', icon: null });
    recordRecentPage({ id: 'page-2', workspaceId: 'workspace-1', title: 'B', icon: null });
    recordRecentPage({ id: 'page-1', workspaceId: 'workspace-1', title: 'A (đổi tên)', icon: null });

    const recent = getRecentPages('workspace-1');
    expect(recent).toHaveLength(2);
    expect(recent[0]).toMatchObject({ pageId: 'page-1', title: 'A (đổi tên)' });
    expect(recent[1]).toMatchObject({ pageId: 'page-2' });
  });

  it('chỉ giữ tối đa 10 mục gần nhất', () => {
    for (let i = 0; i < 12; i += 1) {
      recordRecentPage({ id: `page-${i}`, workspaceId: 'workspace-1', title: `Trang ${i}`, icon: null });
    }

    const recent = getRecentPages('workspace-1');
    expect(recent).toHaveLength(10);
    expect(recent[0].pageId).toBe('page-11');
    expect(recent.map((entry) => entry.pageId)).not.toContain('page-0');
    expect(recent.map((entry) => entry.pageId)).not.toContain('page-1');
  });
});
