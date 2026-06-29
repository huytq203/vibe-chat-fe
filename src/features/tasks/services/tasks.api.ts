import { taskClient } from '../lib/task-client';
import type { Board, BoardColumn, BoardTask, Member, Project } from '../types';

export const tasksApi = {
  listProjects: () => taskClient.get<Project[]>('/api/v1/projects'),
  createProject: (input: { name: string; description?: string }) =>
    taskClient.post<Project>('/api/v1/projects', input),
  getBoard: (projectId: string) => taskClient.get<Board>(`/api/v1/projects/${projectId}/board`),

  createColumn: (projectId: string, input: { name: string; color?: string }) =>
    taskClient.post<BoardColumn>(`/api/v1/projects/${projectId}/columns`, input),

  createTask: (projectId: string, input: { title: string; columnId: string }) =>
    taskClient.post<BoardTask>(`/api/v1/projects/${projectId}/tasks`, input),
  moveTask: (taskId: string, input: { columnId: string; position: number }) =>
    taskClient.patch<BoardTask>(`/api/v1/tasks/${taskId}/move`, input),

  listMembers: (projectId: string) =>
    taskClient.get<Member[]>(`/api/v1/projects/${projectId}/members`),
  addMember: (projectId: string, userId: string) =>
    taskClient.post<Member>(`/api/v1/projects/${projectId}/members`, { userId }),
  removeMember: (projectId: string, userId: string) =>
    taskClient.delete<void>(`/api/v1/projects/${projectId}/members/${userId}`),
};
