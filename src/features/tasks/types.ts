export interface Project {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  isBoardLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BoardTask {
  id: string;
  columnId: string;
  title: string;
  position: number;
  isPinned: boolean;
}

export interface BoardColumn {
  id: string;
  name: string;
  color: string | null;
  position: number;
  isDoneCol: boolean;
  tasks: BoardTask[];
}

export interface Board {
  project: Project;
  columns: BoardColumn[];
}

export type TaskPriority = 'P1' | 'P2' | 'P3';

export interface Tag {
  id: string;
  projectId: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface Member {
  userId: string;
  projectId: string;
  role: string;
  displayName: string;
  avatarUrl: string | null;
  joinedAt: string;
}

export interface ChecklistItem {
  id: string;
  taskId: string;
  content: string;
  isDone: boolean;
  position: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  displayName: string;
  avatarUrl: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  taskId: string;
  projectId: string;
  originalName: string;
  s3Key: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  projectId: string;
  actorId: string;
  actorName: string;
  actorAvatar: string | null;
  action: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface TaskDetail {
  id: string;
  projectId: string;
  columnId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: TaskPriority | null;
  isPinned: boolean;
  position: number;
  assigneeCount: number;
  commentCount: number;
  checklistTotal: number;
  checklistDone: number;
  createdAt: string;
  updatedAt: string;
}

export interface PresignResult {
  uploadUrl: string;
  s3Key: string;
  attachmentId: string;
}
