import { taskClient } from '../lib/task-client';
import type {
  Activity,
  ActivityFeed,
  Attachment,
  Board,
  BoardColumn,
  BoardTask,
  ChecklistItem,
  Comment,
  DirectoryUser,
  JoinRequest,
  Leaderboard,
  Member,
  MyTask,
  PaginationMeta,
  PresignResult,
  Project,
  ProjectInvite,
  ProjectStats,
  ProjectStatus,
  ResolveInvite,
  StatsOverview,
  SubtaskItem,
  Tag,
  TaskDetail,
  TaskPriority,
} from '../types';

export const tasksApi = {
  // --- Projects ---
  // Danh sách phẳng (switcher/dashboard) — lấy tối đa 100 project đầu.
  listProjects: () =>
    taskClient.get<Project[]>('/api/v1/projects?limit=100'),

  // Danh sách phân trang + search — dùng cho trang quản lý dự án (lazy load).
  listProjectsPaged: (params: { page?: number; limit?: number; q?: string }) => {
    const sp = new URLSearchParams();
    sp.set('page', String(params.page ?? 1));
    sp.set('limit', String(params.limit ?? 20));
    if (params.q?.trim()) sp.set('q', params.q.trim());
    return taskClient.getPaged<Project[], PaginationMeta>(
      `/api/v1/projects?${sp.toString()}`,
    );
  },

  createProject: (input: {
    name: string;
    description?: string;
    startDate?: string | null;
    endDate?: string | null;
  }) => taskClient.post<Project>('/api/v1/projects', input),

  updateProject: (
    projectId: string,
    input: {
      name?: string;
      description?: string;
      startDate?: string | null;
      endDate?: string | null;
      status?: ProjectStatus;
    },
  ) => taskClient.patch<Project>(`/api/v1/projects/${projectId}`, input),

  deleteProject: (projectId: string) =>
    taskClient.delete<void>(`/api/v1/projects/${projectId}`),

  // --- Board + Columns ---
  getBoard: (projectId: string) =>
    taskClient.get<Board>(`/api/v1/projects/${projectId}/board`),

  createColumn: (projectId: string, input: { name: string; color?: string }) =>
    taskClient.post<BoardColumn>(`/api/v1/projects/${projectId}/columns`, input),

  updateColumn: (columnId: string, input: { name?: string; color?: string; position?: number }) =>
    taskClient.patch<BoardColumn>(`/api/v1/columns/${columnId}`, input),

  deleteColumn: (columnId: string) => taskClient.delete<void>(`/api/v1/columns/${columnId}`),

  // --- Tasks ---
  getTask: (projectId: string, taskId: string) =>
    taskClient.get<TaskDetail>(`/api/v1/tasks/${taskId}`),

  createTask: (projectId: string, input: { title: string; columnId: string }) =>
    taskClient.post<BoardTask>(`/api/v1/projects/${projectId}/tasks`, input),

  updateTask: (
    taskId: string,
    input: {
      title?: string;
      description?: string | null;
      dueDate?: string | null;
      priority?: TaskPriority | null;
      isPinned?: boolean;
    },
  ) => taskClient.patch<TaskDetail>(`/api/v1/tasks/${taskId}`, input),

  deleteTask: (taskId: string) => taskClient.delete<void>(`/api/v1/tasks/${taskId}`),

  // --- Workflow: complete / reopen ---
  completeTask: (taskId: string) =>
    taskClient.post<TaskDetail>(`/api/v1/tasks/${taskId}/complete`, {}),

  reopenTask: (taskId: string) =>
    taskClient.post<TaskDetail>(`/api/v1/tasks/${taskId}/reopen`, {}),


  moveTask: (taskId: string, input: { columnId: string; position: number }) =>
    taskClient.patch<BoardTask>(`/api/v1/tasks/${taskId}/move`, input),

  getMyTasks: (limit = 20) => taskClient.get<MyTask[]>(`/api/v1/tasks/my?limit=${limit}`),

  // --- Subtasks (task con — là task thật có parentId) ---
  listSubtasks: (parentTaskId: string) =>
    taskClient.get<SubtaskItem[]>(`/api/v1/tasks/${parentTaskId}/subtasks`),

  createSubtask: (parentTaskId: string, title: string) =>
    taskClient.post<TaskDetail>(`/api/v1/tasks/${parentTaskId}/subtasks`, { title }),

  // --- Tags (project) ---
  listProjectTags: (projectId: string) =>
    taskClient.get<Tag[]>(`/api/v1/projects/${projectId}/tags`),

  createTag: (projectId: string, input: { name: string; color: string }) =>
    taskClient.post<Tag>(`/api/v1/projects/${projectId}/tags`, input),

  updateTag: (projectId: string, tagId: string, input: { name?: string; color?: string }) =>
    taskClient.patch<Tag>(`/api/v1/projects/${projectId}/tags/${tagId}`, input),

  deleteTag: (projectId: string, tagId: string) =>
    taskClient.delete<void>(`/api/v1/projects/${projectId}/tags/${tagId}`),

  // --- Tags (task) ---
  attachTag: (taskId: string, tagId: string) =>
    taskClient.post<void>(`/api/v1/tasks/${taskId}/tags/${tagId}`, {}),

  detachTag: (taskId: string, tagId: string) =>
    taskClient.delete<void>(`/api/v1/tasks/${taskId}/tags/${tagId}`),

  listTaskTags: (projectId: string, taskId: string) =>
    taskClient.get<Tag[]>(`/api/v1/projects/${projectId}/tasks/${taskId}/tags`),

  // --- Assignees ---
  listAssignees: (projectId: string, taskId: string) =>
    taskClient.get<Member[]>(`/api/v1/projects/${projectId}/tasks/${taskId}/assignees`),

  addAssignee: (
    projectId: string,
    taskId: string,
    member: { userId: string; displayName: string; avatarUrl?: string | null },
  ) =>
    taskClient.post<void>(`/api/v1/projects/${projectId}/tasks/${taskId}/assignees`, {
      targetUserId: member.userId,
      displayName: member.displayName,
      avatarUrl: member.avatarUrl ?? undefined,
    }),

  removeAssignee: (projectId: string, taskId: string, userId: string) =>
    taskClient.delete<void>(
      `/api/v1/projects/${projectId}/tasks/${taskId}/assignees/${userId}`,
    ),

  // --- Comments ---
  listComments: (projectId: string, taskId: string) =>
    taskClient.get<Comment[]>(`/api/v1/projects/${projectId}/tasks/${taskId}/comments`),

  createComment: (
    projectId: string,
    taskId: string,
    input: { content: string; displayName: string; avatarUrl?: string | null },
  ) =>
    taskClient.post<Comment>(
      `/api/v1/projects/${projectId}/tasks/${taskId}/comments`,
      input,
    ),

  updateComment: (
    projectId: string,
    taskId: string,
    commentId: string,
    input: { content: string },
  ) =>
    taskClient.patch<Comment>(
      `/api/v1/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
      input,
    ),

  deleteComment: (projectId: string, taskId: string, commentId: string) =>
    taskClient.delete<void>(
      `/api/v1/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
    ),

  // --- Checklists ---
  listChecklist: (projectId: string, taskId: string) =>
    taskClient.get<ChecklistItem[]>(
      `/api/v1/projects/${projectId}/tasks/${taskId}/checklists`,
    ),

  createChecklistItem: (projectId: string, taskId: string, input: { content: string }) =>
    taskClient.post<ChecklistItem>(
      `/api/v1/projects/${projectId}/tasks/${taskId}/checklists`,
      input,
    ),

  updateChecklistItem: (
    projectId: string,
    taskId: string,
    itemId: string,
    input: { content?: string; isDone?: boolean },
  ) =>
    taskClient.patch<ChecklistItem>(
      `/api/v1/projects/${projectId}/tasks/${taskId}/checklists/${itemId}`,
      input,
    ),

  deleteChecklistItem: (projectId: string, taskId: string, itemId: string) =>
    taskClient.delete<void>(
      `/api/v1/projects/${projectId}/tasks/${taskId}/checklists/${itemId}`,
    ),

  // --- Attachments ---
  listAttachments: (projectId: string, taskId: string) =>
    taskClient.get<Attachment[]>(
      `/api/v1/projects/${projectId}/tasks/${taskId}/attachments`,
    ),

  presignAttachment: (
    projectId: string,
    taskId: string,
    input: { fileName: string; mimeType: string; fileSize: number },
  ) =>
    taskClient.post<PresignResult>(
      `/api/v1/projects/${projectId}/tasks/${taskId}/attachments/presign`,
      input,
    ),

  confirmAttachment: (projectId: string, taskId: string, attachmentId: string) =>
    taskClient.post<Attachment>(
      `/api/v1/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}/confirm`,
      {},
    ),

  deleteAttachment: (projectId: string, taskId: string, attachmentId: string) =>
    taskClient.delete<void>(
      `/api/v1/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}`,
    ),

  // --- Activities ---
  // BE trả { items, total }; taskId để lọc history của 1 task (tab History trong modal)
  listActivities: (projectId: string, taskId?: string, page = 1, limit = 50) =>
    taskClient.get<{ items: Activity[]; total: number }>(
      `/api/v1/projects/${projectId}/activities?page=${page}&limit=${limit}` +
        (taskId ? `&taskId=${taskId}` : ''),
    ),

  getActivityFeed: (page = 1, limit = 20) =>
    taskClient.get<ActivityFeed>(`/api/v1/activities/feed?page=${page}&limit=${limit}`),

  // --- Members ---
  listMembers: (projectId: string) =>
    taskClient.get<Member[]>(`/api/v1/projects/${projectId}/members`),

  addMember: (projectId: string, userId: string) =>
    taskClient.post<Member>(`/api/v1/projects/${projectId}/members`, { userId }),

  removeMember: (projectId: string, userId: string) =>
    taskClient.delete<void>(`/api/v1/projects/${projectId}/members/${userId}`),

  // --- Sharing (invite link + join requests) ---
  getInvite: (projectId: string) =>
    taskClient.get<ProjectInvite | null>(`/api/v1/projects/${projectId}/invite`),

  enableInvite: (projectId: string) =>
    taskClient.post<ProjectInvite>(`/api/v1/projects/${projectId}/invite`, {}),

  rotateInvite: (projectId: string) =>
    taskClient.post<ProjectInvite>(`/api/v1/projects/${projectId}/invite/rotate`, {}),

  disableInvite: (projectId: string) =>
    taskClient.delete<void>(`/api/v1/projects/${projectId}/invite`),

  listJoinRequests: (projectId: string) =>
    taskClient.get<JoinRequest[]>(
      `/api/v1/projects/${projectId}/join-requests?status=PENDING`,
    ),

  acceptJoinRequest: (reqId: string) =>
    taskClient.post<void>(`/api/v1/join-requests/${reqId}/accept`, {}),

  rejectJoinRequest: (reqId: string) =>
    taskClient.post<void>(`/api/v1/join-requests/${reqId}/reject`, {}),

  resolveInvite: (token: string) =>
    taskClient.get<ResolveInvite>(`/api/v1/invite/${encodeURIComponent(token)}`),

  requestJoin: (token: string) =>
    taskClient.post<void>(`/api/v1/invite/${encodeURIComponent(token)}/request`, {}),

  // --- Stats / Reports ---
  getProjectStats: (projectId: string) =>
    taskClient.get<ProjectStats>(`/api/v1/projects/${projectId}/stats`),

  getStatsOverview: () => taskClient.get<StatsOverview>('/api/v1/stats/overview'),

  getLeaderboard: (projectId: string) =>
    taskClient.get<Leaderboard>(`/api/v1/projects/${projectId}/stats/leaderboard`),

  // --- Users (directory) ---
  searchUsers: (q: string, limit = 10) =>
    taskClient.get<DirectoryUser[]>(
      `/api/v1/users/search?q=${encodeURIComponent(q)}&limit=${limit}`,
    ),
};
