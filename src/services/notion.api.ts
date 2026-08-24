import { apiClient } from '@/lib/api/client';
import type { z } from 'zod';
import {
  breadcrumbSchema,
  deleteFavoriteResultSchema,
  favoriteItemSchema,
  favoriteSchema,
  pageDetailSchema,
  pageSchema,
  permanentDeleteResultSchema,
  removeMemberResultSchema,
  restoreTrashResultSchema,
  softDeletePageResultSchema,
  trashItemSchema,
  workspaceInviteSchema,
  workspaceMemberSchema,
  workspaceSchema,
} from '@/features/notes/schemas';

/**
 * Lớp vận chuyển REST cho Notion.
 * Chỉ vận chuyển dữ liệu, không đụng TanStack Query, bộ nhớ đệm hoặc trạng thái phía máy khách.
 * apiClient tự bóc envelope; mỗi payload thô được kiểm tra lại bằng Zod.
 */

type CreateWorkspaceInput = {
  name: string;
  icon?: string;
};

type UpdateWorkspaceInput = {
  name?: string;
  icon?: string;
};

type CreateInviteInput = {
  invitedUserId?: string;
  email?: string;
  role: 'ADMIN' | 'MEMBER' | 'GUEST';
};

type CreatePageInput = {
  workspaceId: string;
  parentId?: string;
  title?: string;
};

type UpdatePageInput = {
  icon?: string;
  coverUrl?: string;
};

/**
 * `parentId` BẮT BUỘC, kể cả khi chỉ đổi thứ tự trong cùng một cha.
 *
 * BE coi bỏ trống và `null` là như nhau — cả hai đều nghĩa "đưa lên gốc"
 * (`page-move.service.ts`: `dto.parentId ? ... : null`). Nên một lời gọi chỉ
 * kèm `sortKey` để sắp lại thứ tự sẽ **âm thầm nhấc trang lên gốc** và làm
 * gãy cây. Bắt buộc trường này khiến người gọi phải nói rõ cha, và biến cái
 * bẫy lúc chạy thành lỗi lúc biên dịch.
 */
type MovePageInput = {
  parentId: string | null;
  sortKey?: string;
};

type UpsertFavoriteInput = {
  pageId: string;
  sortKey?: string;
};

async function listWorkspaces() {
  const raw = await apiClient.get<unknown>('/api/v1/workspaces', {
    service: 'notion',
  });
  return workspaceSchema.array().parse(raw);
}

async function createWorkspace(input: CreateWorkspaceInput) {
  const raw = await apiClient.post<unknown>('/api/v1/workspaces', {
    body: input,
    service: 'notion',
  });
  return workspaceSchema.parse(raw);
}

async function updateWorkspace(id: string, input: UpdateWorkspaceInput) {
  const raw = await apiClient.patch<unknown>(`/api/v1/workspaces/${id}`, {
    body: input,
    service: 'notion',
  });
  return workspaceSchema.parse(raw);
}

async function listWorkspaceMembers(id: string) {
  const raw = await apiClient.get<unknown>(`/api/v1/workspaces/${id}/members`, {
    service: 'notion',
  });
  return workspaceMemberSchema.array().parse(raw);
}

async function createWorkspaceInvite(id: string, input: CreateInviteInput) {
  const raw = await apiClient.post<unknown>(`/api/v1/workspaces/${id}/invites`, {
    body: input,
    service: 'notion',
  });
  return workspaceInviteSchema.parse(raw);
}

async function removeWorkspaceMember(
  id: string,
  userId: string,
): Promise<z.infer<typeof removeMemberResultSchema>> {
  const raw = await apiClient.delete<unknown>(
    `/api/v1/workspaces/${id}/members/${userId}`,
    { service: 'notion' },
  );
  return removeMemberResultSchema.parse(raw);
}

async function acceptInvite(token: string) {
  const raw = await apiClient.post<unknown>(`/api/v1/invites/${token}/accept`, {
    service: 'notion',
  });
  return workspaceMemberSchema.parse(raw);
}

async function listPageChildren(workspaceId: string, parentId?: string) {
  const raw = await apiClient.get<unknown>(`/api/v1/workspaces/${workspaceId}/pages`, {
    query: { parentId },
    service: 'notion',
  });
  return pageSchema.array().parse(raw);
}

async function createPage(input: CreatePageInput) {
  const raw = await apiClient.post<unknown>('/api/v1/pages', {
    body: input,
    service: 'notion',
  });
  return pageSchema.parse(raw);
}

async function getPageDetail(id: string) {
  const raw = await apiClient.get<unknown>(`/api/v1/pages/${id}`, {
    service: 'notion',
  });
  return pageDetailSchema.parse(raw);
}

async function updatePage(id: string, input: UpdatePageInput) {
  const raw = await apiClient.patch<unknown>(`/api/v1/pages/${id}`, {
    body: input,
    service: 'notion',
  });
  return pageSchema.parse(raw);
}

async function removePage(id: string): Promise<z.infer<typeof softDeletePageResultSchema>> {
  const raw = await apiClient.delete<unknown>(`/api/v1/pages/${id}`, {
    service: 'notion',
  });
  return softDeletePageResultSchema.parse(raw);
}

async function movePage(id: string, input: MovePageInput) {
  const raw = await apiClient.post<unknown>(`/api/v1/pages/${id}/move`, {
    body: input,
    service: 'notion',
  });
  return pageSchema.parse(raw);
}

async function getPageBreadcrumb(id: string) {
  const raw = await apiClient.get<unknown>(`/api/v1/pages/${id}/breadcrumb`, {
    service: 'notion',
  });
  return breadcrumbSchema.parse(raw);
}

async function listTrash(id: string) {
  const raw = await apiClient.get<unknown>(`/api/v1/workspaces/${id}/trash`, {
    service: 'notion',
  });
  return trashItemSchema.array().parse(raw);
}

async function restoreTrash(pageId: string): Promise<z.infer<typeof restoreTrashResultSchema>> {
  const raw = await apiClient.post<unknown>(`/api/v1/trash/${pageId}/restore`, {
    service: 'notion',
  });
  return restoreTrashResultSchema.parse(raw);
}

async function purgeTrash(pageId: string): Promise<z.infer<typeof permanentDeleteResultSchema>> {
  const raw = await apiClient.delete<unknown>(`/api/v1/trash/${pageId}`, {
    service: 'notion',
  });
  return permanentDeleteResultSchema.parse(raw);
}

async function listFavorites() {
  const raw = await apiClient.get<unknown>('/api/v1/favorites', {
    service: 'notion',
  });
  return favoriteItemSchema.array().parse(raw);
}

async function upsertFavorite(
  input: UpsertFavoriteInput,
): Promise<z.infer<typeof favoriteSchema>> {
  const raw = await apiClient.post<unknown>('/api/v1/favorites', {
    body: input,
    service: 'notion',
  });
  return favoriteSchema.parse(raw);
}

async function removeFavorite(
  pageId: string,
): Promise<z.infer<typeof deleteFavoriteResultSchema>> {
  const raw = await apiClient.delete<unknown>(`/api/v1/favorites/${pageId}`, {
    service: 'notion',
  });
  return deleteFavoriteResultSchema.parse(raw);
}

export const workspacesApi = {
  list: listWorkspaces,
  create: createWorkspace,
  update: updateWorkspace,
  members: listWorkspaceMembers,
  createInvite: createWorkspaceInvite,
  removeMember: removeWorkspaceMember,
} as const;

export const invitesApi = { accept: acceptInvite } as const;

export const pagesApi = {
  listChildren: listPageChildren,
  create: createPage,
  detail: getPageDetail,
  update: updatePage,
  remove: removePage,
  move: movePage,
  breadcrumb: getPageBreadcrumb,
} as const;

export const trashApi = {
  list: listTrash,
  restore: restoreTrash,
  purge: purgeTrash,
} as const;

export const favoritesApi = {
  list: listFavorites,
  upsert: upsertFavorite,
  remove: removeFavorite,
} as const;
