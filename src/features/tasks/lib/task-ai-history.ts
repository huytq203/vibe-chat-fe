import type { QueryClient } from '@tanstack/react-query';
import type { AiMessage, AiSession } from '@/features/ai';
import type { AiStreamResult } from '@/features/ai/lib/ai-stream-runner';
import { taskAiHistoryApi, type ConversationMessage } from '@/services/task-ai-history.api';
import { taskKeys } from '../services/keys';

export const NEW_TASK_CONVERSATION_TITLE = 'Cuộc trò chuyện mới';
export const TASK_AI_GLOBAL_SCOPE = '__task_ai_global__';

export function taskAiScope(projectId?: string | null): string {
  return projectId ?? TASK_AI_GLOBAL_SCOPE;
}

export function createTaskDraftSession(scope: string): AiSession {
  return { id: scope, title: NEW_TASK_CONVERSATION_TITLE, messages: [], updatedAt: Date.now() };
}

export function toTaskAiSession(
  detail: { id: string; title: string | null; messages: ConversationMessage[] },
  updatedAt?: string,
): AiSession {
  return {
    id: detail.id,
    title: detail.title ?? NEW_TASK_CONVERSATION_TITLE,
    messages: detail.messages.map(({ role, content, status, attachments }) => ({
      role,
      content,
      ...(status ? { status } : {}),
      ...(attachments ? { attachments } : {}),
    })),
    updatedAt: updatedAt ? new Date(updatedAt).getTime() : Date.now(),
  };
}

export type TaskAiHistoryContext = {
  projectId?: string | null;
  activeId: string | null;
  queryClient: QueryClient;
};

export async function persistTaskAiTurn(
  context: TaskAiHistoryContext,
  user: AiMessage,
  result: AiStreamResult,
): Promise<string | null> {
  if (!result.text) return null;
  const id = context.activeId ?? (await taskAiHistoryApi.create(context.projectId ?? undefined)).id;
  await taskAiHistoryApi.appendTurn(id, {
    user: {
      role: user.role,
      content: user.content,
      ...(user.status ? { status: user.status } : {}),
    },
    assistant: {
      role: 'assistant',
      content: result.text,
      ...(result.status === 'error' ? { status: 'incomplete' as const } : {}),
    },
  });
  await Promise.all([
    context.queryClient.invalidateQueries({ queryKey: taskKeys.aiConversations() }),
    context.queryClient.invalidateQueries({ queryKey: taskKeys.aiConversation(id) }),
  ]);
  return id;
}
