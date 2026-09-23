import { taskClient } from '../lib/task-client';
import type { ProjectClient, ProjectContact } from '../types';

export interface ClientContactInput {
  name: string;
  email?: string | null;
  title?: string | null;
  isPrimary?: boolean;
}

export const clientApi = {
  get: (projectId: string) =>
    taskClient.get<ProjectClient | null>(
      `/api/v1/projects/${projectId}/client`,
    ),

  upsert: (projectId: string, name: string) =>
    taskClient.put<ProjectClient>(`/api/v1/projects/${projectId}/client`, {
      name,
    }),

  addContact: (projectId: string, input: ClientContactInput) =>
    taskClient.post<ProjectContact>(
      `/api/v1/projects/${projectId}/client/contacts`,
      input,
    ),

  updateContact: (
    projectId: string,
    contactId: string,
    input: ClientContactInput,
  ) =>
    taskClient.patch<ProjectContact>(
      `/api/v1/projects/${projectId}/client/contacts/${contactId}`,
      input,
    ),

  removeContact: (projectId: string, contactId: string) =>
    taskClient.delete<void>(
      `/api/v1/projects/${projectId}/client/contacts/${contactId}`,
    ),
};
