import { z } from 'zod';

export const workspaceRoleSchema = z.enum(['OWNER', 'ADMIN', 'MEMBER', 'GUEST']);

export const pageRoleSchema = z.enum(['FULL', 'EDIT', 'COMMENT', 'VIEW']);

export const workspaceRecordSchema = z.object({
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

export const workspaceSchema = workspaceRecordSchema.extend({
  // BE trả kèm vai trò của chính người gọi. Sidebar cần nó để phân biệt guest
  // (cây trang rỗng là đúng thiết kế) với member (cây rỗng là bất thường).
  myRole: workspaceRoleSchema,
});

export const workspaceMemberRecordSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  userId: z.string(),
  role: workspaceRoleSchema,
  invitedBy: z.string().nullable(),
  joinedAt: z.iso.datetime(),
});

export const workspaceMemberSchema = workspaceMemberRecordSchema.extend({
  user: z.object({
    displayName: z.string(),
    avatarUrl: z.string().nullable(),
  }).nullable(),
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

export const deleteWorkspaceResultSchema = z.object({ deleted: z.literal(true) });

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
  parentId: z.string().nullable(),
  parentTitle: z.string().nullable(),
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

export const commentSegmentSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string() }),
  z.object({ type: z.literal('mention'), userId: z.string() }),
]);

export const commentBodySchema = z.object({
  segments: z.array(commentSegmentSchema).min(1),
});

// Create/update trả bản ghi thô; list mới enrich thêm tác giả.
export const commentRecordSchema = z.object({
  id: z.string(),
  pageId: z.string(),
  blockId: z.string().nullable(),
  parentId: z.string().nullable(),
  authorId: z.string(),
  body: commentBodySchema,
  resolvedAt: z.iso.datetime().nullable(),
  resolvedBy: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
});

export const commentSchema = commentRecordSchema.extend({
  author: z.object({
    displayName: z.string(),
    avatarUrl: z.string().nullable(),
  }).nullable(),
});

export const removeCommentResultSchema = z.object({ id: z.string() });

export const pageVersionSchema = z.object({
  id: z.string(),
  pageId: z.string(),
  kind: z.enum(['AUTO', 'MANUAL', 'BEFORE_RESTORE', 'BEFORE_AI']),
  label: z.string().nullable(),
  sizeBytes: z.number().int(),
  preview: z.string(),
  createdBy: z.string(),
  createdAt: z.iso.datetime(),
});

export const pageVersionDetailSchema = pageVersionSchema.extend({
  title: z.string(),
  html: z.string(),
  markdown: z.string(),
});

export const restoreVersionResultSchema = z.object({
  pageId: z.string(),
  previousVersionId: z.string().nullable(),
});

export const publicPageChildSchema = z.object({
  id: z.string(),
  title: z.string(),
  icon: z.string().nullable(),
});

export const publicPageSchema = z.object({
  id: z.string(),
  title: z.string(),
  icon: z.string().nullable(),
  coverUrl: z.string().nullable(),
  html: z.string(),
  includeSubpages: z.boolean(),
  children: z.array(publicPageChildSchema),
  allowIndexing: z.boolean(),
  createdBy: z.string().optional(),
  lastEditedBy: z.string().nullable().optional(),
});

export const publicUnlockInputSchema = z.object({
  // Không trim: khoảng trắng có thể là một phần có chủ đích của mật khẩu.
  password: z.string().min(1).max(1024),
});

export const publicUnlockResultSchema = z.object({
  sessionToken: z.string().min(1),
});

export const permissionSubjectTypeSchema = z.enum(['USER', 'WORKSPACE']);

export const pagePermissionSchema = z.object({
  id: z.string(),
  pageId: z.string(),
  subjectType: permissionSubjectTypeSchema,
  subjectId: z.string(),
  role: pageRoleSchema,
  grantedBy: z.string(),
  createdAt: z.iso.datetime(),
});

export const effectivePagePermissionSchema = z.object({
  permission: pagePermissionSchema,
  inherited: z.boolean(),
  sourcePageId: z.string(),
  sourcePageTitle: z.string(),
});

export const setPermissionInputSchema = z.object({
  subjectType: permissionSubjectTypeSchema,
  subjectId: z.string().min(1, 'Hãy chọn một người').max(64),
  role: pageRoleSchema,
});

export const permissionFormSchema = setPermissionInputSchema.pick({
  subjectId: true,
  role: true,
});

export const shareLinkSchema = z.object({
  id: z.string(),
  pageId: z.string(),
  token: z.string(),
  includeSubpages: z.boolean(),
  expiresAt: z.iso.datetime().nullable(),
  revokedAt: z.iso.datetime().nullable(),
  allowIndexing: z.boolean(),
  showAuthors: z.boolean(),
  viewCount: z.number().int(),
  lastViewedAt: z.iso.datetime().nullable(),
  createdBy: z.string(),
  createdAt: z.iso.datetime(),
});

const shareLinkOptionsSchema = z.object({
  includeSubpages: z.boolean().optional(),
  password: z.string().min(1).max(256).optional(),
  expiresAt: z.iso.datetime().optional(),
  allowIndexing: z.boolean().optional(),
  showAuthors: z.boolean().optional(),
});

export const createShareLinkInputSchema = shareLinkOptionsSchema;
export const updateShareLinkInputSchema = shareLinkOptionsSchema.extend({
  password: z.string().min(1).max(256).nullable().optional(),
  expiresAt: z.iso.datetime().nullable().optional(),
});

export const shareLinkFormSchema = z.object({
  password: z.string().max(256, 'Mật khẩu tối đa 256 ký tự'),
  expiresAt: z.string().refine(
    (value) => value === '' || !Number.isNaN(Date.parse(value)),
    'Hạn dùng không hợp lệ',
  ),
  includeSubpages: z.boolean(),
  allowIndexing: z.boolean(),
  showAuthors: z.boolean(),
});

export const revokePermissionResultSchema = z.object({ revoked: z.literal(true) });

export const searchResultSchema = z.object({
  pageId: z.string(),
  title: z.string(),
  icon: z.string().nullable(),
  // ts_headline (BE) nhúng sẵn <b>…</b> quanh từ khớp — không phải HTML tuỳ ý,
  // xem searchResultSegments() ở lib để render an toàn, không dangerouslySetInnerHTML.
  snippet: z.string(),
  role: pageRoleSchema,
});

export const presignedUploadResultSchema = z.object({
  url: z.string(),
  attachmentId: z.string(),
});

export const attachmentDownloadUrlSchema = z.object({
  url: z.string(),
});

export const pageHtmlExportSchema = z.object({ html: z.string() });
export const pageMarkdownExportSchema = z.object({ markdown: z.string() });
