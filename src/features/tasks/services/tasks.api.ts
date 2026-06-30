import { taskClient } from '../lib/task-client';
import type {
  Activity,
  Attachment,
  Board,
  BoardColumn,
  BoardTask,
  ChecklistItem,
  Comment,
  Member,
  PresignResult,
  Project,
  Tag,
  TaskDetail,
  TaskPriority,
} from '../types';

export const tasksApi = {
  // --- Projects ---
  listProjects: () =>
    taskClient.get<Project[]>('/api/v1/projects'),

  createProject: (input: { name: string; description?: string }) =>
    taskClient.post<Project>('/api/v1/projects', input),

  updateProject: (projectId: string, input: { name?: string; description?: string }) =>
    taskClient.patch<Project>(`/api/v1/projects/${projectId}`, input),

  // --- Board + Columns ---
  getBoard: (projectId: string) =>
    taskClient.get<Board>(`/api/v1/projects/${projectId}/board`),

  createColumn: (projectId: string, input: { name: string; color?: string }) =>
    taskClient.post<BoardColumn>(`/api/v1/projects/${projectId}/columns`, input),

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

  moveTask: (taskId: string, input: { columnId: string; position: number }) =>
    taskClient.patch<BoardTask>(`/api/v1/tasks/${taskId}/move`, input),

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
    input: { originalName: string; mimeType: string; size: number },
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
  listActivities: (projectId: string) =>
    taskClient.get<Activity[]>(`/api/v1/projects/${projectId}/activities`),

  // --- Members ---
  listMembers: (projectId: string) =>
    taskClient.get<Member[]>(`/api/v1/projects/${projectId}/members`),

  addMember: (projectId: string, userId: string) =>
    taskClient.post<Member>(`/api/v1/projects/${projectId}/members`, { userId }),

  removeMember: (projectId: string, userId: string) =>
    taskClient.delete<void>(`/api/v1/projects/${projectId}/members/${userId}`),
};
