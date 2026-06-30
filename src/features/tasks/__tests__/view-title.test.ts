import { describe, it, expect } from 'vitest';
import { getViewTitle } from '../lib/view-title';

describe('getViewTitle', () => {
  it('home → Trang chủ', () => {
    expect(getViewTitle('home').title).toBe('Trang chủ');
  });
  it('reports → Báo cáo', () => {
    expect(getViewTitle('reports').title).toBe('Báo cáo');
  });
  it('board lấy tên project', () => {
    const p = { id: 'p1', name: 'Dự án A' } as never;
    expect(getViewTitle('board', p).title).toBe('Dự án A');
  });
});
