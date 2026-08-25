import type { z } from 'zod';
import { apiClient } from '@/lib/api/client';
import type { CommentBody } from '@/features/notes/types';
import {
  breadcrumbSchema, commentRecordSchema, commentSchema, deleteFavoriteResultSchema,
  effectivePagePermissionSchema, favoriteItemSchema, favoriteSchema, pageDetailSchema,
  pagePermissionSchema, pageSchema, pageVersionDetailSchema, pageVersionSchema,
  permanentDeleteResultSchema, publicPageSchema, publicUnlockResultSchema,
  removeCommentResultSchema, removeMemberResultSchema, restoreTrashResultSchema,
  restoreVersionResultSchema, revokePermissionResultSchema, searchResultSchema,
  shareLinkSchema, softDeletePageResultSchema, trashItemSchema, workspaceInviteSchema,
  workspaceMemberRecordSchema, workspaceMemberSchema, workspaceSchema,
} from '@/features/notes/schemas';
import type { CreateShareLinkInput, SetPermissionInput,
  UpdateShareLinkInput } from '@/features/notes/types';

type CreateWorkspaceInput = { name: string; icon?: string };
type UpdateWorkspaceInput = { name?: string; icon?: string };
type CreateInviteInput = { invitedUserId?: string; email?: string;
  role: 'ADMIN' | 'MEMBER' | 'GUEST' };
type CreatePageInput = { workspaceId: string; parentId?: string; title?: string };
type UpdatePageInput = { icon?: string | null; coverUrl?: string | null };

/** `parentId` bắt buộc để đổi thứ tự không vô tình nhấc trang lên gốc. */
type MovePageInput = { parentId: string | null; sortKey?: string };
type UpsertFavoriteInput = { pageId: string; sortKey?: string };
type CreateCommentInput = {
  body: CommentBody;
  blockId?: string;
  parentId?: string;
};
type UpdateCommentInput = { body?: CommentBody; resolved?: boolean };
type CreateVersionInput = { label?: string };

interface PublicPageOptions { pageId?: string; sessionToken?: string }

export const PUBLIC_PAGE_SESSION_COOKIE = 'halo_public_share_session';
const PUBLIC_SHARE_SESSION_HEADER = 'x-share-session';

export const workspacesApi = {
  list: async () => {
    const raw = await apiClient.get<unknown>('/api/v1/workspaces', { service: 'notion' });
    return workspaceSchema.array().parse(raw);
  },
  create: async (input: CreateWorkspaceInput) => {
    const raw = await apiClient.post<unknown>('/api/v1/workspaces', {
      body: input, service: 'notion',
    });
    return workspaceSchema.parse(raw);
  },
  update: async (id: string, input: UpdateWorkspaceInput) => {
    const raw = await apiClient.patch<unknown>(`/api/v1/workspaces/${id}`, {
      body: input, service: 'notion',
    });
    return workspaceSchema.parse(raw);
  },
  members: async (id: string) => {
    const raw = await apiClient.get<unknown>(`/api/v1/workspaces/${id}/members`, {
      service: 'notion',
    });
    return workspaceMemberSchema.array().parse(raw);
  },
  createInvite: async (id: string, input: CreateInviteInput) => {
    const raw = await apiClient.post<unknown>(`/api/v1/workspaces/${id}/invites`, {
      body: input, service: 'notion',
    });
    return workspaceInviteSchema.parse(raw);
  },
  removeMember: async (
    id: string,
    userId: string,
  ): Promise<z.infer<typeof removeMemberResultSchema>> => {
    const raw = await apiClient.delete<unknown>(`/api/v1/workspaces/${id}/members/${userId}`, {
      service: 'notion',
    });
    return removeMemberResultSchema.parse(raw);
  },
} as const;

export const invitesApi = {
  accept: async (token: string) => {
    const raw = await apiClient.post<unknown>(`/api/v1/invites/${token}/accept`, {
      service: 'notion',
    });
    return workspaceMemberRecordSchema.parse(raw);
  },
} as const;

export const pagesApi = {
  listChildren: async (workspaceId: string, parentId?: string) => {
    const raw = await apiClient.get<unknown>(`/api/v1/workspaces/${workspaceId}/pages`, {
      query: { parentId }, service: 'notion',
    });
    return pageSchema.array().parse(raw);
  },
  create: async (input: CreatePageInput) => {
    const raw = await apiClient.post<unknown>('/api/v1/pages', {
      body: input, service: 'notion',
    });
    return pageSchema.parse(raw);
  },
  detail: async (id: string) => {
    const raw = await apiClient.get<unknown>(`/api/v1/pages/${id}`, { service: 'notion' });
    return pageDetailSchema.parse(raw);
  },
  update: async (id: string, input: UpdatePageInput) => {
    const raw = await apiClient.patch<unknown>(`/api/v1/pages/${id}`, {
      body: input, service: 'notion',
    });
    return pageSchema.parse(raw);
  },
  remove: async (id: string): Promise<z.infer<typeof softDeletePageResultSchema>> => {
    const raw = await apiClient.delete<unknown>(`/api/v1/pages/${id}`, {
      service: 'notion',
    });
    return softDeletePageResultSchema.parse(raw);
  },
  move: async (id: string, input: MovePageInput) => {
    const raw = await apiClient.post<unknown>(`/api/v1/pages/${id}/move`, {
      body: input, service: 'notion',
    });
    return pageSchema.parse(raw);
  },
  breadcrumb: async (id: string) => {
    const raw = await apiClient.get<unknown>(`/api/v1/pages/${id}/breadcrumb`, {
      service: 'notion',
    });
    return breadcrumbSchema.parse(raw);
  },
} as const;

export const trashApi = {
  list: async (id: string) => {
    const raw = await apiClient.get<unknown>(`/api/v1/workspaces/${id}/trash`, {
      service: 'notion',
    });
    return trashItemSchema.array().parse(raw);
  },
  restore: async (pageId: string): Promise<z.infer<typeof restoreTrashResultSchema>> => {
    const raw = await apiClient.post<unknown>(`/api/v1/trash/${pageId}/restore`, {
      service: 'notion',
    });
    return restoreTrashResultSchema.parse(raw);
  },
  purge: async (pageId: string): Promise<z.infer<typeof permanentDeleteResultSchema>> => {
    const raw = await apiClient.delete<unknown>(`/api/v1/trash/${pageId}`, {
      service: 'notion',
    });
    return permanentDeleteResultSchema.parse(raw);
  },
} as const;

export const searchApi = {
  search: async (workspaceId: string, q: string, limit?: number) => {
    const raw = await apiClient.get<unknown>('/api/v1/search', {
      query: { q, workspaceId, limit },
      service: 'notion',
    });
    return searchResultSchema.array().parse(raw);
  },
} as const;

export const favoritesApi = {
  list: async () => {
    const raw = await apiClient.get<unknown>('/api/v1/favorites', { service: 'notion' });
    return favoriteItemSchema.array().parse(raw);
  },
  upsert: async (input: UpsertFavoriteInput): Promise<z.infer<typeof favoriteSchema>> => {
    const raw = await apiClient.post<unknown>('/api/v1/favorites', {
      body: input, service: 'notion',
    });
    return favoriteSchema.parse(raw);
  },
  remove: async (pageId: string): Promise<z.infer<typeof deleteFavoriteResultSchema>> => {
    const raw = await apiClient.delete<unknown>(`/api/v1/favorites/${pageId}`, {
      service: 'notion',
    });
    return deleteFavoriteResultSchema.parse(raw);
  },
} as const;

export const commentsApi = {
  list: async (pageId: string, params: { blockId?: string } = {}) => {
    const raw = await apiClient.get<unknown>(`/api/v1/pages/${pageId}/comments`, {
      query: { blockId: params.blockId }, service: 'notion',
    });
    return commentSchema.array().parse(raw);
  },
  create: async (pageId: string, input: CreateCommentInput) => {
    const raw = await apiClient.post<unknown>(`/api/v1/pages/${pageId}/comments`, {
      body: input, service: 'notion',
    });
    return commentRecordSchema.parse(raw);
  },
  update: async (commentId: string, input: UpdateCommentInput) => {
    const raw = await apiClient.patch<unknown>(`/api/v1/comments/${commentId}`, {
      body: input, service: 'notion',
    });
    return commentRecordSchema.parse(raw);
  },
  remove: async (commentId: string) => {
    const raw = await apiClient.delete<unknown>(`/api/v1/comments/${commentId}`, {
      service: 'notion',
    });
    return removeCommentResultSchema.parse(raw);
  },
} as const;

export const versionsApi = {
  list: async (pageId: string) => {
    const raw = await apiClient.get<unknown>(`/api/v1/pages/${pageId}/versions`, {
      service: 'notion',
    });
    return pageVersionSchema.array().parse(raw);
  },
  create: async (pageId: string, input: CreateVersionInput) => {
    const raw = await apiClient.post<unknown>(`/api/v1/pages/${pageId}/versions`, {
      body: input, service: 'notion',
    });
    return pageVersionSchema.parse(raw);
  },
  detail: async (versionId: string) => {
    const raw = await apiClient.get<unknown>(`/api/v1/versions/${versionId}`, {
      service: 'notion',
    });
    return pageVersionDetailSchema.parse(raw);
  },
  restore: async (versionId: string) => {
    const raw = await apiClient.post<unknown>(`/api/v1/versions/${versionId}/restore`, {
      service: 'notion',
    });
    return restoreVersionResultSchema.parse(raw);
  },
} as const;

export const permissionsApi = {
  list: async (pageId: string) => {
    const raw = await apiClient.get<unknown>(`/api/v1/pages/${pageId}/permissions`, {
      service: 'notion',
    });
    return effectivePagePermissionSchema.array().parse(raw);
  },
  set: async (pageId: string, input: SetPermissionInput) => {
    const raw = await apiClient.put<unknown>(`/api/v1/pages/${pageId}/permissions`, {
      body: input, service: 'notion',
    });
    return pagePermissionSchema.parse(raw);
  },
  remove: async (pageId: string, permissionId: string) => {
    const path = `/api/v1/pages/${pageId}/permissions/${permissionId}`;
    const raw = await apiClient.delete<unknown>(path, { service: 'notion' });
    return revokePermissionResultSchema.parse(raw);
  },
} as const;

export const shareLinksApi = {
  get: async (pageId: string) => {
    const raw = await apiClient.get<unknown>(`/api/v1/pages/${pageId}/share-link`, {
      service: 'notion',
    });
    return shareLinkSchema.nullable().parse(raw);
  },
  create: async (pageId: string, input: CreateShareLinkInput) => {
    const raw = await apiClient.post<unknown>(`/api/v1/pages/${pageId}/share-link`, {
      body: input, service: 'notion',
    });
    return shareLinkSchema.parse(raw);
  },
  update: async (linkId: string, input: UpdateShareLinkInput) => {
    const raw = await apiClient.patch<unknown>(`/api/v1/share-links/${linkId}`, {
      body: input, service: 'notion',
    });
    return shareLinkSchema.parse(raw);
  },
  remove: async (linkId: string) => {
    const raw = await apiClient.delete<unknown>(`/api/v1/share-links/${linkId}`,
      { service: 'notion' });
    return shareLinkSchema.parse(raw);
  },
} as const;

function publicPagePath(token: string, pageId?: string): string {
  const base = `/api/v1/public/${encodeURIComponent(token)}`;
  return pageId ? `${base}/pages/${encodeURIComponent(pageId)}` : base;
}

export const publicPagesApi = {
  detail: async (token: string, options: PublicPageOptions = {}) => {
    const raw = await apiClient.get<unknown>(publicPagePath(token, options.pageId), {
      auth: false,
      cache: 'no-store',
      headers: options.sessionToken
        ? { [PUBLIC_SHARE_SESSION_HEADER]: options.sessionToken }
        : undefined,
      service: 'notion',
    });
    return publicPageSchema.parse(raw);
  },
  unlock: async (token: string, password: string) => {
    const raw = await apiClient.post<unknown>(
      `/api/v1/public/${encodeURIComponent(token)}/unlock`,
      { auth: false, body: { password }, cache: 'no-store', service: 'notion' },
    );
    return publicUnlockResultSchema.parse(raw);
  },
} as const;
