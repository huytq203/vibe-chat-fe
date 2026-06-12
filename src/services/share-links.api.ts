import { apiClient } from '@/lib/api/client';
import type {
  CreateShareLinkInput,
  ResolveShareLink,
  ShareLink,
  UseShareLinkResult,
} from '@/features/share-links/types';

/**
 * Share link REST transport. Pure — không đụng cache/state. Xem 25-share-links.md.
 * Hook TanStack Query ở features/share-links/hooks/*.
 */
export const shareLinksApi = {
  create: (input: CreateShareLinkInput) =>
    apiClient.post<ShareLink>('/api/v1/share-links', { body: input }),

  listMine: () => apiClient.get<ShareLink[]>('/api/v1/share-links/me'),

  /** Xem trước (không tiêu hao lượt). */
  resolve: (code: string) =>
    apiClient.get<ResolveShareLink>(`/api/v1/share-links/${code}`),

  /** Dùng link (kết bạn / vào nhóm) — tiêu hao 1 lượt khi thành công. */
  use: (code: string) =>
    apiClient.post<UseShareLinkResult>(`/api/v1/share-links/${code}/use`),

  revoke: (code: string) =>
    apiClient.delete<{ ok: true }>(`/api/v1/share-links/${code}`),
} as const;
