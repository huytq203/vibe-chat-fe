'use client';

import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { AiAvatar, AiMascot } from '@/components/common/BrandAssets';
import { Button } from '@/components/ui/button/Button';
import { AiChatInput, AiMessageList, useAiConversation } from '@/features/ai';
import type { AiStreamFn } from '@/features/ai';
import { AiConversationBar } from '@/features/notes/components/panel/AiConversationBar';
import { aiApi } from '@/services/ai.api';
import { useTaskAiConversation } from '../../hooks/useTaskAiConversation';
import { useTaskAiConversationTitle } from '../../hooks/useTaskAiConversationTitle';
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
  my_performance: 'Đang tính hiệu suất…',
  search_pages: 'Đang tìm ghi chú…', read_page: 'Đang đọc ghi chú…',
};

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
  const {
    conversations,
    activeId,
    session,
    actions,
    isLoading,
    isError,
    select,
    startNew,
    refetch,
  } = useTaskAiConversation(selectedProjectId);
  const generatedTitle = useTaskAiConversationTitle({
    activeId,
    conversations,
    messages: session.messages,
  });

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
    streamKey: `tasks:assistant:${selectedProjectId ?? 'all'}`,
    session,
    actions,
    stream,
    onTool,
    onSettled,
  });

  async function handleSend(prompt: string): Promise<void> {
    if (isLoading || conversation.loading || !prompt.trim()) return;
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

  const activeSummary = conversations.find(({ id }) => id === activeId);
  const activeTitle = generatedTitle ?? activeSummary?.title ?? (activeId ? session.title : null);

  return (
    <aside
      id="task-ai-panel"
      aria-label="Trợ lý AI"
      className="absolute inset-y-0 right-0 z-30 flex min-h-0 w-full flex-col overflow-hidden bg-background shadow-xl md:max-w-[420px] md:rounded-l-2xl xl:relative xl:inset-auto xl:z-auto xl:w-[390px] xl:max-w-none xl:shrink-0 xl:rounded-2xl xl:border xl:shadow-subtle"
    >
      <header className="flex min-h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-3">
          <AiAvatar className="size-9 shadow-micro ring-1 ring-primary/15" />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-foreground">Trợ lý công việc</h2>
            <p className="truncate text-xs text-muted-foreground">Hỏi, tạo và cập nhật công việc</p>
          </div>
        </div>
        <Button
          size="icon-sm"
          variant="ghost"
          className="size-11 shrink-0 rounded-xl"
          onClick={toggleAiPanel}
          aria-label="Đóng trợ lý AI"
        >
          <X className="size-4" />
        </Button>
      </header>

      <AiConversationBar
        conversations={conversations}
        activeId={activeId}
        activeTitle={activeTitle}
        isLoading={isLoading}
        isError={isError}
        onSelect={select}
        onStartNew={startNew}
        onRetry={refetch}
      />

      {session.messages.length === 0 && !conversation.loading ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-6 py-8 text-center">
          <AiMascot className="size-28 drop-shadow-[0_14px_22px_rgb(61_31_91/0.14)]" alt="" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Bạn muốn xử lý việc gì?</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Chọn một gợi ý hoặc nhập yêu cầu cho Halo AI.
            </p>
          </div>
          <div className="flex w-full max-w-[260px] flex-col gap-2">
            {SUGGESTIONS.map((prompt) => (
              <Button
                key={prompt}
                size="sm"
                variant="secondary"
                className="h-auto min-h-10 w-full justify-start whitespace-normal rounded-xl px-4 py-2.5 text-left leading-snug"
                onClick={() => void handleSend(prompt)}
              >
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
        variant="panel"
        input={input}
        loading={isLoading || conversation.loading}
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
