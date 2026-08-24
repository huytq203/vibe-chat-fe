import { z } from 'zod';
import {
  breadcrumbSchema,
  favoriteItemSchema,
  pageDetailSchema,
  pageRoleSchema,
  pageSchema,
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
