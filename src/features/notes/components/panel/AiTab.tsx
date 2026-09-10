'use client';

import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { AiChatInput, AiMessageList, useAiConversation } from '@/features/ai';
import type { AiStreamFn } from '@/features/ai';
import { AiConversationBar } from '@/features/notes/components/panel/AiConversationBar';
import { AiPageChangeCard } from '@/features/notes/components/panel/AiPageChangeCard';
import { useAiConversationTitle } from '@/features/notes/hooks/useAiConversationTitle';
import { useAiPageChange } from '@/features/notes/hooks/useAiPageChange';
import { useNoteAiConversation } from '@/features/notes/hooks/useNoteAiConversation';
import { usePage } from '@/features/notes/hooks/use-query';
import { notionKeys } from '@/services/keys';
import { notionAiApi } from '@/services/notion-ai.api';

const DEFAULT_STATUS = 'Đang xử lý…';
const SUGGESTIONS = ['Tóm tắt trang này', 'Chuẩn hoá định dạng'] as const;
const TOOL_LABELS: Record<string, string> = {
  search_pages: 'Đang tìm trang…',
  read_page: 'Đang đọc trang…',
  create_page: 'Đang tạo trang…',
  write_page_content: 'Đang ghi vào trang…',
};

function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? DEFAULT_STATUS;
}

interface AiEmptyStateProps {
  onPick: (prompt: string) => void;
}

function AiEmptyState({ onPick }: AiEmptyStateProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">Hỏi AI về trang này</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Bắt đầu bằng một gợi ý hoặc nhập câu hỏi của bạn.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((prompt) => (
          <Button key={prompt} type="button" size="sm" variant="outline" onClick={() => onPick(prompt)}>
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  );
}

function handleInputKeyDown(
  event: React.KeyboardEvent<HTMLTextAreaElement>,
  onSend: () => void,
  disabled: boolean,
) {
  if (event.key !== 'Enter' || event.shiftKey) return;
  event.preventDefault();
  if (!disabled) onSend();
}

interface AiTabProps {
  pageId: string;
  workspaceId: string;
}

export function AiTab({ pageId, workspaceId }: AiTabProps) {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState(DEFAULT_STATUS);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const {
    conversations, activeId, session, actions, isLoading, isError, select, startNew,
  } = useNoteAiConversation(workspaceId, pageId);
  const generatedTitle = useAiConversationTitle({
    workspaceId, activeId, conversations, messages: session.messages,
  });
  const pageQuery = usePage(pageId);
  const { changedVersion, checkForChange, dismissChange } = useAiPageChange(pageId);
  const stream = useCallback<AiStreamFn>(
    (messages, _attachments, options) =>
      notionAiApi.chatStream(messages, { workspaceId, pageId }, options),
    [workspaceId, pageId],
  );
  const onSettled = useCallback(() => {
    setStatus(DEFAULT_STATUS);
    textareaRef.current?.focus();
    void checkForChange();
  }, [checkForChange]);
  const onTool = useCallback((name: string) => setStatus(toolLabel(name)), []);
  const conversation = useAiConversation({
    streamKey: `notes:${workspaceId}`,
    session,
    actions,
    stream,
    onTool,
    onSettled,
  });

  async function handleSend(text: string) {
    if (isLoading || conversation.loading || !text.trim()) return;
    setInput('');
    setStatus(DEFAULT_STATUS);
    await conversation.send(text, []);
  }

  function handleEdit(index: number) {
    setInput(conversation.recall(index));
    textareaRef.current?.focus();
  }

  const retryHistory = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: notionKeys.aiConversations(workspaceId) });
    if (activeId) {
      void queryClient.invalidateQueries({ queryKey: notionKeys.aiConversation(activeId) });
    }
  }, [activeId, queryClient, workspaceId]);

  const messages = session.messages;
  const activeSummary = conversations.find(({ id }) => id === activeId);
  const activeTitle = generatedTitle ?? activeSummary?.title ?? (activeId ? session.title : null);
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden" aria-label="Trợ lý AI">
      <AiConversationBar
        conversations={conversations}
        activeId={activeId}
        activeTitle={activeTitle}
        isLoading={isLoading}
        isError={isError}
        onSelect={select}
        onStartNew={startNew}
        onRetry={retryHistory}
      />
      {messages.length === 0 && !conversation.loading ? (
        <AiEmptyState onPick={(prompt) => void handleSend(prompt)} />
      ) : (
        <AiMessageList
          messages={messages}
          loading={conversation.loading}
          streaming={conversation.streaming}
          onRegenerate={conversation.regenerate}
          onResend={conversation.resend}
          onEdit={handleEdit}
          onDiscard={conversation.discard}
        />
      )}
      {conversation.loading && (
        <p className="px-4 pb-1 text-xs text-muted-foreground" role="status" aria-live="polite">
          {status}
        </p>
      )}
      {changedVersion && (
        <div className="shrink-0 px-3 pb-2">
          <AiPageChangeCard
            key={changedVersion.id}
            pageId={pageId}
            pageTitle={pageQuery.data?.title || 'Không tiêu đề'}
            version={changedVersion}
            onRestored={dismissChange}
          />
        </div>
      )}
      <AiChatInput
        input={input}
        loading={isLoading || conversation.loading}
        textareaRef={textareaRef}
        onInputChange={setInput}
        onResize={() => undefined}
        onKeyDown={handleInputKeyDown}
        onSend={() => void handleSend(input)}
        onStop={conversation.stop}
      />
    </section>
  );
}
