import { apiClient } from '@/lib/api/client';
import type {
  Notification,
  NotificationPage,
  RegisterFcmTokenInput,
} from '@/features/notifications/types';

/**
 * Notification + FCM token REST transport. Pure — không đụng cache/state.
 * Hook TanStack ở features/notifications/hooks/*.
 */
export const notificationsApi = {
  list: async (params: {
    page: number;
    limit: number;
    unreadOnly?: boolean;
  }): Promise<NotificationPage> => {
    const { data, meta } = await apiClient.rawWithMeta<Notification[]>(
      'GET',
      '/api/v1/notifications',
      {
        query: {
          page: params.page,
          limit: params.limit,
          unreadOnly: params.unreadOnly ?? false,
        },
      },
    );
    const m = meta as
      | {
          page?: number;
          limit?: number;
          total?: number;
          totalPages?: number;
          unreadCount?: number;
        }
      | undefined;
    return {
      items: data,
      page: m?.page ?? params.page,
      limit: m?.limit ?? params.limit,
      total: m?.total ?? data.length,
      totalPages: m?.totalPages ?? 1,
      unreadCount: m?.unreadCount ?? 0,
    };
  },

  unreadCount: (params?: { category?: 'system' | 'message' }) =>
    apiClient.get<{ unreadCount: number }>('/api/v1/notifications/unread-count', {
      query: params?.category ? { category: params.category } : undefined,
    }),

  markRead: (id: string) =>
    apiClient.post<{ ok: true }>(`/api/v1/notifications/${id}/read`),

  markAllRead: () =>
    apiClient.post<{ updated: number }>('/api/v1/notifications/read-all'),

  remove: (id: string) =>
    apiClient.delete<{ ok: true }>(`/api/v1/notifications/${id}`),

  registerFcmToken: (input: RegisterFcmTokenInput) =>
    apiClient.post<{ ok: true }>('/api/v1/notifications/fcm-tokens', {
      body: input,
    }),

  deleteFcmToken: (token: string) =>
    apiClient.delete<{ ok: true }>('/api/v1/notifications/fcm-tokens', {
      body: { token },
    }),
} as const;
