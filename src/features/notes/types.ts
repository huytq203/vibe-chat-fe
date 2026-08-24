import { z } from 'zod';
import {
  breadcrumbSchema,
  commentBodySchema,
  commentSchema,
  commentSegmentSchema,
  favoriteItemSchema,
  pageDetailSchema,
  pageRoleSchema,
  pageSchema,
  pageVersionDetailSchema,
  pageVersionSchema,
  trashItemSchema,
  workspaceInviteSchema,
  workspaceMemberSchema,
  workspaceRoleSchema,
  workspaceSchema,
} from './schemas';

export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;
export type PageRole = z.infer<typeof pageRoleSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type WorkspaceMember = z.infer<typeof workspaceMemberSchema>;
export type WorkspaceInvite = z.infer<typeof workspaceInviteSchema>;
export type Page = z.infer<typeof pageSchema>;
export type PageDetail = z.infer<typeof pageDetailSchema>;
export type FavoriteItem = z.infer<typeof favoriteItemSchema>;
export type TrashItem = z.infer<typeof trashItemSchema>;
export type Breadcrumb = z.infer<typeof breadcrumbSchema>;
export type CommentSegment = z.infer<typeof commentSegmentSchema>;
export type CommentBody = z.infer<typeof commentBodySchema>;
export type Comment = z.infer<typeof commentSchema>;
export type PageVersion = z.infer<typeof pageVersionSchema>;
export type PageVersionDetail = z.infer<typeof pageVersionDetailSchema>;
