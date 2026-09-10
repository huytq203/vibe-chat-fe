'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AiMessage } from '@/features/ai';
import { NEW_CONVERSATION_TITLE } from '@/features/notes/lib/note-ai-history';
import { aiApi } from '@/services/ai.api';
import { notionKeys } from '@/services/keys';
import {
  notionAiHistoryApi,
  type ConversationDetail,
  type ConversationSummary,
} from '@/services/notion-ai-history.api';

interface UseAiConversationTitleOptions {
  workspaceId: string;
  activeId: string | null;
  conversations: ConversationSummary[];
  messages: AiMessage[];
}

interface TitleInput {
  id: string;
  question: string;
}

function fallbackTitle(question: string): string {
  return question.slice(0, 40) || NEW_CONVERSATION_TITLE;
}

function cleanTitle(value: string, fallback: string): string {
  const unquoted = value.trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim();
  return unquoted.split(/\s+/).slice(0, 6).join(' ') || fallback;
}

async function generateTitle({ id, question }: TitleInput): Promise<{ id: string; title: string }> {
  const fallback = fallbackTitle(question);
  let title = fallback;
  try {
    const answer = await aiApi.chat([{
      role: 'user',
      content: `Đặt tiêu đề tiếng Việt tối đa 6 từ. Chỉ trả về tiêu đề:\n${question}`,
    }]);
    title = cleanTitle(answer, fallback);
  } catch {
    // Đặt tên dự phòng vẫn phải được PATCH để hội thoại không bao giờ vô danh.
  }
  await notionAiHistoryApi.rename(id, title);
  return { id, title };
}

export function useAiConversationTitle({
  workspaceId,
  activeId,
  conversations,
  messages,
}: UseAiConversationTitleOptions): string | null {
  const queryClient = useQueryClient();
  const attempted = useRef(new Set<string>());
  const [generated, setGenerated] = useState<{ id: string; title: string } | null>(null);
  const { mutate } = useMutation({
    mutationFn: generateTitle,
    retry: false,
    onSuccess: ({ id, title }) => {
      queryClient.setQueryData<ConversationSummary[]>(
        notionKeys.aiConversations(workspaceId),
        (current) => current?.map((item) => item.id === id ? { ...item, title } : item),
      );
      queryClient.setQueryData<ConversationDetail>(
        notionKeys.aiConversation(id),
        (current) => current ? { ...current, title } : current,
      );
      setGenerated({ id, title });
      void queryClient.invalidateQueries({ queryKey: notionKeys.aiConversations(workspaceId) });
    },
  });

  useEffect(() => {
    if (!activeId || attempted.current.has(activeId)) return;
    const summary = conversations.find(({ id }) => id === activeId);
    const question = messages.find(({ role }) => role === 'user')?.content;
    const hasAnswer = messages.some(({ role }) => role === 'assistant');
    if (summary?.title || !question || !hasAnswer) return;
    attempted.current.add(activeId);
    mutate({ id: activeId, question });
  }, [activeId, conversations, messages, mutate]);

  return generated?.id === activeId ? generated.title : null;
}
