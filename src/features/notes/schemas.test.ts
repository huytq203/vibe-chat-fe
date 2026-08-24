import { describe, expect, it } from 'vitest';
import { pageRoleSchema, pageSchema } from './schemas';

const validPage = {
  id: 'page-1',
  workspaceId: 'workspace-1',
  parentId: null,
  path: '/page-1',
  depth: 0,
  sortKey: 'a0',
  title: 'Trang đầu tiên',
  icon: null,
  coverUrl: null,
  createdBy: 'user-1',
  lastEditedBy: null,
  createdAt: '2026-08-24T08:30:00.000Z',
  updatedAt: '2026-08-24T08:30:00.000Z',
  deletedAt: null,
  deletedBy: null,
  deletedRootId: null,
};

describe('pageSchema', () => {
  it('parse payload hợp lệ và giữ parentId là null', () => {
    const result = pageSchema.safeParse(validPage);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect('parentId' in result.data).toBe(true);
    expect(result.data).toStrictEqual(validPage);
  });

  it('từ chối payload thiếu trường bắt buộc', () => {
    const pageWithoutTitle = Object.fromEntries(
      Object.entries(validPage).filter(([key]) => key !== 'title'),
    );

    expect(pageSchema.safeParse(pageWithoutTitle).success).toBe(false);
  });

  it('nhận thời gian ISO và từ chối Date object hoặc timestamp', () => {
    expect(pageSchema.safeParse(validPage).success).toBe(true);
    expect(
      pageSchema.safeParse({ ...validPage, createdAt: new Date(validPage.createdAt) }).success,
    ).toBe(false);
    expect(pageSchema.safeParse({ ...validPage, createdAt: 1_777_000_000_000 }).success).toBe(
      false,
    );
  });
});

describe('pageRoleSchema', () => {
  it('nhận FULL và từ chối ADMIN', () => {
    expect(pageRoleSchema.safeParse('FULL').success).toBe(true);
    expect(pageRoleSchema.safeParse('ADMIN').success).toBe(false);
  });
});
