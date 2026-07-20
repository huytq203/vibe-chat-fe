/** Trạng thái vòng đời project do owner đặt tay (khớp BE enum ProjectStatus). */
export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'PENDING' | 'COMPLETED';

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  isBoardLocked: boolean;
  /** Trạng thái vòng đời do owner đặt */
  status: ProjectStatus;
  /** Suy diễn từ BE: endDate đã qua và status chưa COMPLETED */
  isOverdue: boolean;
  /** Ngày bắt đầu / kết thúc dự kiến của dự án (ISO), null nếu chưa đặt */
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Meta phân trang trả kèm list endpoint (khớp BE PaginationMeta). */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface Paged<T> {
  data: T;
  meta: PaginationMeta;
}

export interface BoardTaskTag {
  id: string;
  name: string;
  color: string;
}

export interface BoardTaskAssignee {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface BoardTask {
  id: string;
  version?: number;
  columnId: string;
  title: string;
  position: number;
  isPinned: boolean;
  priority: 'P1' | 'P2' | 'P3' | null;
  dueDate: string | null;
  tags: BoardTaskTag[];
  assignees: BoardTaskAssignee[];
  checklistCount: number;
  commentCount: number;
  /** Thời điểm hoàn thành (ISO) — null nghĩa là task chưa done */
  completedAt: string | null;
  /** Thời điểm member yêu cầu owner duyệt (ISO) — null nếu chưa */
  reviewRequestedAt: string | null;
  /** Trạng thái workflow trên board (ARCHIVED đã bị loại nên chỉ 3 giá trị) */
  status: 'OPEN' | 'IN_REVIEW' | 'DONE';
}

export interface BoardColumn {
  id: string;
  version?: number;
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

export type JoinRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

/** Link mời của project (FE tự ghép URL từ token + origin). */
export interface ProjectInvite {
  token: string;
  isActive: boolean;
}

/** 1 yêu cầu tham gia project (đã enrich tên/avatar). */
export interface JoinRequest {
  id: string;
  projectId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  status: JoinRequestStatus;
  createdAt: string;
}

/** Kết quả resolve token ở trang join. */
export interface ResolveInvite {
  projectId: string;
  projectName: string;
  alreadyMember: boolean;
  requestStatus: JoinRequestStatus | null;
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
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: string;
  /** Presigned URL để tải file — BE trả kèm khi list/confirm */
  downloadUrl?: string;
}

export interface Activity {
  id: string;
  projectId: string;
  taskId: string | null;
  actorId: string;
  actorName: string;
  actorAvatar: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface TaskDetail {
  id: string;
  version: number;
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
  /** Thời điểm hoàn thành (ISO) — null nghĩa là task chưa done */
  completedAt: string | null;
  /** Thời điểm member thường yêu cầu owner duyệt (ISO) — null nếu chưa */
  reviewRequestedAt: string | null;
  reviewRequestedBy: string | null;
  /** Trạng thái workflow suy diễn từ BE */
  status: TaskWorkflowStatus;
  /** ID task cha nếu đây là subtask; null nếu là task cấp cao nhất */
  parentId: string | null;
  /** Số task con */
  subtaskCount: number;
  /** Nhãn của task — BE trả kèm trong task detail (không có endpoint list riêng). */
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

/** Trạng thái workflow của task (khớp BE). */
export type TaskWorkflowStatus = 'OPEN' | 'IN_REVIEW' | 'DONE';

/** Một dòng subtask trong danh sách task con. */
export interface SubtaskItem {
  id: string;
  title: string;
  columnId: string;
  priority: TaskPriority | null;
  dueDate: string | null;
  completedAt: string | null;
  status: TaskWorkflowStatus;
  isPinned: boolean;
  subtaskCount: number;
  assignees: BoardTaskAssignee[];
  tags: BoardTaskTag[];
}

export interface PresignResult {
  uploadUrl: string;
  attachmentId: string;
}

/** Task được gán cho user hiện tại (view "Việc của tôi", gộp từ nhiều project) */
export interface MyTask {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  columnId: string;
  columnName: string;
  priority: TaskPriority | null;
  dueDate: string | null;
  isPinned: boolean;
  updatedAt: string;
}

/** Feed hoạt động tổng hợp (mọi project user tham gia), có phân trang */
export interface ActivityFeed {
  items: Activity[];
  total: number;
}

export interface ProjectStats {
  projectId: string;
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  completionRate: number;
}

export interface StatsOverview {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  projects: ProjectStats[];
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  completedTasks: number;
  totalAssigned: number;
}

export interface Leaderboard {
  entries: LeaderboardEntry[];
}

/** User từ directory chung (tìm để mời vào project) — khác Member (đã thuộc project) */
export interface DirectoryUser {
  userId: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
}

export interface ProjectChange {
  seq: number;
  type: string;
  payload: unknown;
  actorId: string;
  at: string;
}

export interface ChangesResponse {
  resync: boolean;
  changes: ProjectChange[];
}
