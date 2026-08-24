import { describe, expect, it } from 'vitest';
import type { Page } from '@/features/notes/types';
import { sortKeyBetween, sortKeyForDrop } from './sort-key';

function buildPage(id: string, sortKey: string): Page {
  return {
    id,
    workspaceId: 'workspace-1',
    parentId: null,
    path: `.${id}.`,
    depth: 1,
    sortKey,
    title: id,
    icon: null,
    coverUrl: null,
    createdBy: 'user-1',
    lastEditedBy: null,
    createdAt: '2026-08-24T00:00:00.000Z',
    updatedAt: '2026-08-24T00:00:00.000Z',
    deletedAt: null,
    deletedBy: null,
    deletedRootId: null,
  };
}

describe('khoá sắp xếp phân số', () => {
  const first = buildPage('trang-a', 'a0');
  const second = buildPage('trang-b', 'a2');

  it('sinh khoá trước phần tử đầu dù danh sách đầu vào chưa được sắp', () => {
    const key = sortKeyForDrop([second, first], 0);
    expect(key < first.sortKey).toBe(true);
  });

  it('sinh khoá đúng giữa hai hàng xóm', () => {
    const key = sortKeyForDrop([second, first], 1);
    expect(first.sortKey < key && key < second.sortKey).toBe(true);
  });

  it('sinh khoá sau phần tử cuối', () => {
    const key = sortKeyForDrop([second, first], 2);
    expect(second.sortKey < key).toBe(true);
  });

  it('chỉ sinh ký tự chữ và số mà BE chấp nhận', () => {
    expect(sortKeyBetween('a0', 'a1')).toMatch(/^[A-Za-z0-9]+$/);
    expect(sortKeyForDrop([], 0)).toMatch(/^[A-Za-z0-9]+$/);
  });
});
