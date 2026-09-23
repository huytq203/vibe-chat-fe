/**
 * Query key factory cho Tasks BC — dùng chung giữa query và invalidation
 * để đảm bảo key khớp tuyệt đối (xem convention ở @/services/keys).
 */
export const taskKeys = {
  all: ['tasks'] as const,
  projects: () => [...taskKeys.all, 'projects'] as const,
  board: (projectId: string) => [...taskKeys.all, 'board', projectId] as const,
} as const;
