import { taskClient } from '../lib/task-client';
import type { ProjectScope, ScopeItemStatus } from '../types';

export const scopeApi = {
  get: (projectId: string) =>
    taskClient.get<ProjectScope>(`/api/v1/projects/${projectId}/scope`),

  updateDocument: (projectId: string, rawDocument: string, version: number) =>
    taskClient.put<ProjectScope>(
      `/api/v1/projects/${projectId}/scope/document`,
      {
        rawDocument,
        version,
      },
    ),

  addItem: (
    projectId: string,
    input: {
      title: string;
      description?: string;
      position?: number;
      version: number;
    },
  ) =>
    taskClient.post<ProjectScope>(
      `/api/v1/projects/${projectId}/scope/items`,
      input,
    ),

  updateItem: (
    projectId: string,
    itemId: string,
    input: Partial<{
      title: string;
      description: string;
      status: ScopeItemStatus;
      position: number;
    }> & { version: number },
  ) =>
    taskClient.patch<ProjectScope>(
      `/api/v1/projects/${projectId}/scope/items/${itemId}`,
      input,
    ),

  removeItem: (projectId: string, itemId: string, version: number) =>
    taskClient.delete<ProjectScope>(
      `/api/v1/projects/${projectId}/scope/items/${itemId}`,
      { version },
    ),
};
