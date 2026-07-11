import { describe, expect, it } from 'vitest';
import { findFolderById } from './utils';
import type { StoreFolder } from './types';

function makeFolder(overrides: Partial<StoreFolder>): StoreFolder {
  return {
    id: 'default-id',
    userId: 'u1',
    name: 'default',
    parentId: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('findFolderById', () => {
  it('tìm thấy folder ở cấp top-level', () => {
    const folders = [makeFolder({ id: 'a', name: 'A' }), makeFolder({ id: 'b', name: 'B' })];
    expect(findFolderById(folders, 'b')?.name).toBe('B');
  });

  it('tìm thấy folder lồng sâu trong children', () => {
    const folders = [
      makeFolder({
        id: 'a',
        name: 'A',
        children: [
          makeFolder({
            id: 'a1',
            name: 'A1',
            parentId: 'a',
            children: [makeFolder({ id: 'a1a', name: 'A1A', parentId: 'a1' })],
          }),
        ],
      }),
    ];
    expect(findFolderById(folders, 'a1a')?.name).toBe('A1A');
  });

  it('trả về null nếu không tìm thấy', () => {
    const folders = [makeFolder({ id: 'a', name: 'A' })];
    expect(findFolderById(folders, 'zzz')).toBeNull();
  });
});
