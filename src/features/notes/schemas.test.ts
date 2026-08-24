import { describe, expect, it } from 'vitest';
import {
  commentBodySchema,
  pageRoleSchema,
  pageSchema,
  pageVersionSchema,
} from './schemas';

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

describe('schema bình luận và phiên bản', () => {
  it('nhận đúng đoạn chữ và đoạn nhắc người dùng', () => {
    const body = {
      segments: [
        { type: 'text', text: 'Chào ' },
        { type: 'mention', userId: 'user-2' },
      ],
    };

    expect(commentBodySchema.safeParse(body).success).toBe(true);
    expect(commentBodySchema.safeParse({ segments: [{ type: 'mention' }] }).success).toBe(false);
  });

  it('từ chối thời gian phiên bản chưa serialize', () => {
    const version = {
      id: 'version-1', pageId: 'page-1', kind: 'MANUAL', label: null,
      sizeBytes: 128, preview: 'Bản xem trước', createdBy: 'user-1',
      createdAt: '2026-08-24T00:00:00.000Z',
    };

    expect(pageVersionSchema.safeParse(version).success).toBe(true);
    expect(pageVersionSchema.safeParse({ ...version, createdAt: new Date() }).success).toBe(false);
  });
});
