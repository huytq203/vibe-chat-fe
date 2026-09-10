import type { QueryClient } from '@tanstack/react-query';
import type { AiAttachmentMeta, AiMessage, AiSession } from '@/features/ai';
import type { AiStreamResult } from '@/features/ai/lib/ai-stream-runner';
import { notionKeys } from '@/services/keys';
import { notionAiHistoryApi } from '@/services/notion-ai-history.api';
import type { ConversationMessage } from '@/services/notion-ai-history.api';

export const NEW_CONVERSATION_TITLE = 'Cuộc trò chuyện mới';

export function createDraftSession(workspaceId: string): AiSession {
  return { id: workspaceId, title: NEW_CONVERSATION_TITLE, messages: [], updatedAt: Date.now() };
}

export function toAiSession(
  detail: { id: string; title: string | null; messages: ConversationMessage[] },
  updatedAt?: string,
): AiSession {
  return {
    id: detail.id,
    title: detail.title ?? NEW_CONVERSATION_TITLE,
    messages: detail.messages,
    updatedAt: updatedAt ? new Date(updatedAt).getTime() : Date.now(),
  };
}

export type NoteAiHistoryContext = {
  workspaceId: string;
  pageId: string;
  activeId: string | null;
  queryClient: QueryClient;
};

function attachmentFile(attachment: AiAttachmentMeta): File | null {
  if (!attachment.data) return null;
  const encoded = attachment.data.includes(',')
    ? attachment.data.slice(attachment.data.indexOf(',') + 1)
    : attachment.data;
  const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  return new File([bytes], attachment.name, { type: attachment.mimeType });
}

async function storeMessage(
  id: string,
  message: AiMessage,
): Promise<ConversationMessage> {
  const files = (message.attachments ?? [])
    .map(attachmentFile)
    .filter((file): file is File => file !== null);
  const attachments = await Promise.all(
    files.map((file) => notionAiHistoryApi.uploadAttachment(id, file)),
  );
  return {
    role: message.role,
    content: message.content,
    ...(message.status ? { status: message.status } : {}),
    ...(attachments.length > 0 ? { attachments } : {}),
  };
}

async function persistTurn(
  context: NoteAiHistoryContext,
  user: AiMessage,
  assistant: AiMessage,
): Promise<string> {
  const id = context.activeId ?? (await notionAiHistoryApi.create(
    context.workspaceId, context.pageId,
  )).id;
  const [storedUser, storedAssistant] = await Promise.all([
    storeMessage(id, user),
    storeMessage(id, assistant),
  ]);
  await notionAiHistoryApi.appendTurn(id, { user: storedUser, assistant: storedAssistant });
  await Promise.all([
    context.queryClient.invalidateQueries({
      queryKey: notionKeys.aiConversations(context.workspaceId),
    }),
    context.queryClient.invalidateQueries({ queryKey: notionKeys.aiConversation(id) }),
  ]);
  return id;
}

export async function persistNoteAiTurn(
  context: NoteAiHistoryContext,
  user: AiMessage,
  result: AiStreamResult,
): Promise<string | null> {
  if (!result.text) return null;
  const assistant: AiMessage = {
    role: 'assistant',
    content: result.text,
    ...(result.status === 'error' ? { status: 'incomplete' as const } : {}),
  };
  return persistTurn(context, user, assistant);
}
