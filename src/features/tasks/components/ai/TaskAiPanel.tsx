'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { AiMascot } from '@/components/common/BrandAssets';
import { Button } from '@/components/ui/button/Button';
import { AiChatInput, AiMessageList, useAiConversation } from '@/features/ai';
import type { AiMessage, AiSession, AiSessionActions, AiStreamFn } from '@/features/ai';
import { aiApi } from '@/services/ai.api';
import { taskKeys } from '../../services/keys';
import { useTasksUIStore } from '../../stores/tasks-ui.store';
import { buildTaskAiContext } from '../../lib/ai-context';

const DEFAULT_STATUS = 'Đang xử lý…';
const SUGGESTIONS = [
  'Việc của tôi đang mở',
  'Tiến độ project này',
  'Tạo task mới giao cho…',
] as const;
const MUTATING_TOOLS = new Set(['create_project', 'create_task', 'update_task']);
const TOOL_LABELS: Record<string, string> = {
  list_projects: 'Đang xem project…', create_project: 'Đang tạo project…',
  list_project_members: 'Đang xem thành viên…', list_tasks: 'Đang tìm task…',
  create_task: 'Đang tạo task…', update_task: 'Đang cập nhật task…',
  my_tasks: 'Đang lấy việc của bạn…', project_stats: 'Đang tính tiến độ…',
  project_leaderboard: 'Đang xếp hạng…',
  search_pages: 'Đang tìm ghi chú…', read_page: 'Đang đọc ghi chú…',
};

function createSession(): AiSession {
  return { id: 'task-ai', title: 'Trợ lý công việc', messages: [], updatedAt: Date.now() };
}

function lastUserIndex(messages: AiMessage[]): number {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user') return index;
  }
  return -1;
}

function clearFailure(message: AiMessage): AiMessage {
  const next = { ...message };
  delete next.status;
  delete next.errorMessage;
  return next;
}

function useTaskAiSession(): { session: AiSession; actions: AiSessionActions } {
  const [session, setSession] = useState(createSession);
  const sessionRef = useRef(session);
  const commit = useCallback((messages: AiMessage[]): void => {
    const next = { ...sessionRef.current, messages, updatedAt: Date.now() };
    sessionRef.current = next;
    setSession(next);
  }, []);

  const actions = useMemo<AiSessionActions>(() => ({
    createSession: () => sessionRef.current.id,
    pushMessage: (_sessionId, message) => commit([...sessionRef.current.messages, message]),
    dropLastAssistant: () => {
      const messages = sessionRef.current.messages;
      const next = messages.at(-1)?.role === 'assistant' ? messages.slice(0, -1) : messages;
      commit(next);
      return next;
    },
    markLastUserFailed: (_sessionId, reason) => {
      const index = lastUserIndex(sessionRef.current.messages);
      if (index < 0) return;
      commit(sessionRef.current.messages.map((message, currentIndex) =>
        currentIndex === index ? { ...message, status: 'failed', errorMessage: reason } : message));
    },
    prepareResend: (_sessionId, index) => {
      const target = sessionRef.current.messages[index];
      if (!target) return [];
      const history = sessionRef.current.messages.slice(0, index + 1)
        .map((message, currentIndex) => currentIndex === index ? clearFailure(message) : message);
      commit(history);
      return history;
    },
    removeMessage: (_sessionId, index) => {
      const target = sessionRef.current.messages[index];
      if (!target) return null;
      commit(sessionRef.current.messages.filter((_, currentIndex) => currentIndex !== index));
      return target;
    },
  }), [commit]);

  return { session, actions };
}

function handleInputKeyDown(
  event: React.KeyboardEvent<HTMLTextAreaElement>,
  onSend: () => void,
  disabled: boolean,
): void {
  if (event.key !== 'Enter' || event.shiftKey) return;
  event.preventDefault();
  if (!disabled) onSend();
}

export function TaskAiPanel() {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState(DEFAULT_STATUS);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasMutationRef = useRef(false);
  const selectedProjectId = useTasksUIStore((state) => state.selectedProjectId);
  const toggleAiPanel = useTasksUIStore((state) => state.toggleAiPanel);
  const queryClient = useQueryClient();
  const { session, actions } = useTaskAiSession();

  const stream = useCallback<AiStreamFn>((messages, attachments, options) =>
    aiApi.chatStream(
      messages, attachments, options, buildTaskAiContext(selectedProjectId),
    ), [selectedProjectId]);
  const onTool = useCallback((name: string): void => {
    setStatus(TOOL_LABELS[name] ?? DEFAULT_STATUS);
    if (MUTATING_TOOLS.has(name)) hasMutationRef.current = true;
  }, []);
  const onSettled = useCallback((): void => {
    setStatus(DEFAULT_STATUS);
    textareaRef.current?.focus();
    if (!hasMutationRef.current) return;
    hasMutationRef.current = false;
    void queryClient.invalidateQueries({ queryKey: taskKeys.projects() });
    void queryClient.invalidateQueries({ queryKey: ['tasks', 'my'] });
    if (selectedProjectId) {
      void queryClient.invalidateQueries({ queryKey: taskKeys.board(selectedProjectId) });
    }
  }, [queryClient, selectedProjectId]);
  const conversation = useAiConversation({
    streamKey: 'tasks:assistant', session, actions, stream, onTool, onSettled,
  });

  async function handleSend(prompt: string): Promise<void> {
    if (conversation.loading || !prompt.trim()) return;
    setInput('');
    setStatus(DEFAULT_STATUS);
    hasMutationRef.current = false;
    await conversation.send(prompt, []);
  }

  function handleEdit(index: number): void {
    setInput(conversation.recall(index));
    textareaRef.current?.focus();
  }

  function prepareRetry(action: () => void): void {
    hasMutationRef.current = false;
    setStatus(DEFAULT_STATUS);
    action();
  }

  return (
    <aside
      id="task-ai-panel"
      aria-label="Trợ lý AI"
      className="absolute inset-0 z-20 flex min-h-0 flex-col overflow-hidden border-l bg-background md:relative md:inset-auto md:w-[360px] md:shrink-0"
    >
      <header className="flex h-12 shrink-0 items-center justify-between border-b px-3">
        <div className="flex items-center gap-2">
          <AiMascot className="size-8" alt="" />
          <h2 className="text-sm font-bold text-foreground">Trợ lý công việc</h2>
        </div>
        <Button size="icon-sm" variant="ghost" onClick={toggleAiPanel} aria-label="Đóng trợ lý AI">
          <X className="size-4" />
        </Button>
      </header>

      {session.messages.length === 0 && !conversation.loading ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
          <AiMascot className="size-24" alt="" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Bạn muốn xử lý việc gì?</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Chọn một gợi ý hoặc nhập yêu cầu cho Halo AI.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {SUGGESTIONS.map((prompt) => (
              <Button key={prompt} size="sm" variant="outline" onClick={() => void handleSend(prompt)}>
                {prompt}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <AiMessageList
          messages={session.messages}
          loading={conversation.loading}
          pendingUser={conversation.pendingUser}
          streaming={conversation.streaming}
          onRegenerate={() => prepareRetry(conversation.regenerate)}
          onResend={(index) => prepareRetry(() => conversation.resend(index))}
          onEdit={handleEdit}
          onDiscard={conversation.discard}
        />
      )}
      {conversation.loading && (
        <p className="px-4 pb-1 text-xs text-muted-foreground" role="status" aria-live="polite">
          {status}
        </p>
      )}
      <AiChatInput
        input={input}
        loading={conversation.loading}
        textareaRef={textareaRef}
        onInputChange={setInput}
        onResize={() => undefined}
        onKeyDown={handleInputKeyDown}
        onSend={() => void handleSend(input)}
        onStop={conversation.stop}
      />
    </aside>
  );
}
