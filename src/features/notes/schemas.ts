import { z } from 'zod';

export const workspaceRoleSchema = z.enum(['OWNER', 'ADMIN', 'MEMBER', 'GUEST']);

export const pageRoleSchema = z.enum(['FULL', 'EDIT', 'COMMENT', 'VIEW']);

export const workspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  icon: z.string().nullable(),
  type: z.enum(['PERSONAL', 'TEAM']),
  ownerId: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
});

export const workspaceMemberSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  userId: z.string(),
  role: workspaceRoleSchema,
  invitedBy: z.string().nullable(),
  joinedAt: z.iso.datetime(),
});

export const workspaceInviteSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  invitedUserId: z.string().nullable(),
  email: z.string().nullable(),
  role: workspaceRoleSchema,
  token: z.string(),
  expiresAt: z.iso.datetime(),
  acceptedAt: z.iso.datetime().nullable(),
  revokedAt: z.iso.datetime().nullable(),
  createdBy: z.string(),
  createdAt: z.iso.datetime(),
});

export const removeMemberResultSchema = z.object({ removed: z.literal(true) });

export const pageSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  parentId: z.string().nullable(),
  path: z.string(),
  depth: z.number().int(),
  sortKey: z.string(),
  title: z.string(),
  icon: z.string().nullable(),
  coverUrl: z.string().nullable(),
  createdBy: z.string(),
  lastEditedBy: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
  deletedBy: z.string().nullable(),
  deletedRootId: z.string().nullable(),
});

export const pageDetailSchema = pageSchema.extend({
  myRole: pageRoleSchema,
});

// Trả về của DELETE /pages/:id — soft delete, không phải Page.
export const softDeletePageResultSchema = z.object({
  deletedPageCount: z.number().int(),
});

export const favoriteItemSchema = z.object({
  userId: z.string(),
  pageId: z.string(),
  sortKey: z.string(),
  title: z.string(),
  icon: z.string().nullable(),
});

// Favorite thô từ POST /favorites, không có title/icon như dữ liệu danh sách.
export const favoriteSchema = z.object({
  userId: z.string(),
  pageId: z.string(),
  sortKey: z.string(),
});

export const deleteFavoriteResultSchema = z.object({ deleted: z.boolean() });

export const trashItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  icon: z.string().nullable(),
  deletedAt: z.iso.datetime(),
  deletedBy: z.string().nullable(),
  // Số trang sẽ quay lại khi khôi phục mục này.
  pageCount: z.number().int(),
});

export const restoreTrashResultSchema = z.object({
  restoredPageCount: z.number().int(),
  reparentedToRoot: z.boolean(),
});

export const permanentDeleteResultSchema = z.object({
  deletedPageCount: z.number().int(),
  deletedObjectCount: z.number().int(),
});

export const breadcrumbSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    icon: z.string().nullable(),
  }),
);
