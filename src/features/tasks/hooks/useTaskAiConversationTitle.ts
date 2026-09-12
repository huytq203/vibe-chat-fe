'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AiMessage } from '@/features/ai';
import { aiApi } from '@/services/ai.api';
import {
  taskAiHistoryApi,
  type ConversationDetail,
  type ConversationSummary,
} from '@/services/task-ai-history.api';
import { NEW_TASK_CONVERSATION_TITLE } from '../lib/task-ai-history';
import { taskKeys } from '../services/keys';

interface UseTaskAiConversationTitleOptions {
  activeId: string | null;
  conversations: ConversationSummary[];
  messages: AiMessage[];
}

interface TitleInput {
  id: string;
  question: string;
}

function fallbackTitle(question: string): string {
  return question.slice(0, 40) || NEW_TASK_CONVERSATION_TITLE;
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
  await taskAiHistoryApi.rename(id, title);
  return { id, title };
}

export function useTaskAiConversationTitle({
  activeId,
  conversations,
  messages,
}: UseTaskAiConversationTitleOptions): string | null {
  const queryClient = useQueryClient();
  const attempted = useRef(new Set<string>());
  const [generated, setGenerated] = useState<{ id: string; title: string } | null>(null);
  const { mutate } = useMutation({
    mutationFn: generateTitle,
    retry: false,
    onSuccess: ({ id, title }) => {
      queryClient.setQueryData<ConversationSummary[]>(
        taskKeys.aiConversations(),
        (current) => current?.map((item) => item.id === id ? { ...item, title } : item),
      );
      queryClient.setQueryData<ConversationDetail>(
        taskKeys.aiConversation(id),
        (current) => current ? { ...current, title } : current,
      );
      setGenerated({ id, title });
      void queryClient.invalidateQueries({ queryKey: taskKeys.aiConversations() });
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
