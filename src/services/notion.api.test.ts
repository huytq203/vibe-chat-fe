import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { workspaceSchema } from '@/features/notes/schemas';

const NOTION_URL = 'http://localhost:3007';
const CHAT_URL = 'http://localhost:3005';
const server = setupServer();

type NotionApiModule = typeof import('./notion.api');

let notionApi: NotionApiModule;

function envelope(data: unknown) {
  return HttpResponse.json({
    success: true,
    data,
    timestamp: '2026-08-24T00:00:00.000Z',
  });
}

const workspace = {
  id: 'workspace-1',
  name: 'Ghi chú cá nhân',
  slug: 'ghi-chu-ca-nhan',
  icon: null,
  type: 'PERSONAL',
  ownerId: 'user-1',
  myRole: 'OWNER',
  createdAt: '2026-08-24T00:00:00.000Z',
  updatedAt: '2026-08-24T00:00:00.000Z',
  deletedAt: null,
};

const sharedPage = {
  id: 'page-1',
  workspaceId: 'workspace-1',
  parentId: null,
  path: '/page-1',
  depth: 0,
  sortKey: 'a0',
  title: 'Trang được chia sẻ',
  icon: null,
  coverUrl: null,
  createdBy: 'user-1',
  lastEditedBy: null,
  createdAt: '2026-08-24T00:00:00.000Z',
  updatedAt: '2026-08-24T00:00:00.000Z',
  deletedAt: null,
  deletedBy: null,
  deletedRootId: null,
  myRole: 'VIEW',
};

const comment = {
  id: 'comment-1',
  pageId: 'page-1',
  blockId: 'block-1',
  parentId: null,
  authorId: 'user-1',
  body: { segments: [{ type: 'text', text: 'Một bình luận' }] },
  resolvedAt: null,
  resolvedBy: null,
  createdAt: '2026-08-24T00:00:00.000Z',
  updatedAt: '2026-08-24T00:00:00.000Z',
  deletedAt: null,
  author: { displayName: 'Người viết', avatarUrl: null },
};

beforeAll(async () => {
  vi.stubEnv('NEXT_PUBLIC_USE_PROXY', 'false');
  vi.resetModules();
  notionApi = await import('./notion.api');
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('lớp vận chuyển API ghi chú', () => {
  it('định tuyến GET danh sách workspace qua base notion', async () => {
    let receivedUrl: URL | undefined;
    server.use(
      http.get(`${NOTION_URL}/api/v1/workspaces`, ({ request }) => {
        receivedUrl = new URL(request.url);
        return envelope([workspace]);
      }),
    );

    const result = await notionApi.workspacesApi.list();

    expect(result).toEqual([workspace]);
    expect(receivedUrl?.origin).toBe(NOTION_URL);
    expect(receivedUrl?.origin).not.toBe(CHAT_URL);
    expect(receivedUrl?.pathname).toBe('/api/v1/workspaces');
  });

  it('không gửi parentId khi lấy danh sách trang gốc', async () => {
    let receivedUrl: URL | undefined;
    server.use(
      http.get(`${NOTION_URL}/api/v1/workspaces/:workspaceId/pages`, ({ request }) => {
        receivedUrl = new URL(request.url);
        return envelope([]);
      }),
    );

    const result = await notionApi.pagesApi.listChildren('workspace-1');

    expect(result).toEqual([]);
    expect(receivedUrl?.searchParams.has('parentId')).toBe(false);
    expect(receivedUrl?.search).toBe('');
  });

  it('gọi đúng endpoint trang được chia sẻ và phân giải theo schema', async () => {
    let receivedUrl: URL | undefined;
    server.use(
      http.get(`${NOTION_URL}/api/v1/workspaces/:workspaceId/pages/shared`, ({ request }) => {
        receivedUrl = new URL(request.url);
        return envelope([sharedPage]);
      }),
    );

    const result = await notionApi.pagesApi.listShared('workspace-1');

    expect(result).toHaveLength(1);
    expect(result[0].myRole).toBe('VIEW');
    expect(receivedUrl?.pathname).toBe('/api/v1/workspaces/workspace-1/pages/shared');
  });

  it('phân giải được workspace có myRole', () => {
    expect(() => workspaceSchema.parse({ ...workspace, myRole: 'GUEST' })).not.toThrow();
  });

  it('ném lỗi khi response workspace sai schema', async () => {
    server.use(
      http.get(`${NOTION_URL}/api/v1/workspaces`, () =>
        envelope([{ ...workspace, createdAt: 123 }]),
      ),
    );

    await expect(notionApi.workspacesApi.list()).rejects.toThrow();
  });

  it('định tuyến GET bình luận qua base notion và gửi blockId', async () => {
    let receivedUrl: URL | undefined;
    server.use(
      http.get(`${NOTION_URL}/api/v1/pages/page-1/comments`, ({ request }) => {
        receivedUrl = new URL(request.url);
        return envelope([comment]);
      }),
    );

    const result = await notionApi.commentsApi.list('page-1', { blockId: 'block-1' });

    expect(result).toEqual([comment]);
    expect(receivedUrl?.origin).toBe(NOTION_URL);
    expect(receivedUrl?.searchParams.get('blockId')).toBe('block-1');
  });

  it('ném lỗi khi response bình luận sai kiểu thời gian', async () => {
    server.use(
      http.get(`${NOTION_URL}/api/v1/pages/page-1/comments`, () =>
        envelope([{ ...comment, createdAt: 123 }]),
      ),
    );

    await expect(notionApi.commentsApi.list('page-1')).rejects.toThrow();
  });
});
