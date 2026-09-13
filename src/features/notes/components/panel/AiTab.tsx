'use client';

import { useCallback, useEffect, useState } from 'react';
import { AiMascot } from '@/components/common/BrandAssets';
import { Button } from '@/components/ui/button/Button';
import { AiChatInput, AiMessageList, useAiConversation } from '@/features/ai';
import type { AiStreamFn } from '@/features/ai';
import { useAiAttachments } from '@/features/chat/hooks/useAiAttachments';
import { useAutoResizeTextarea } from '@/features/chat/hooks/useAutoResizeTextarea';
import { AiConversationBar } from '@/features/ai/components/AiConversationBar';
import { AiPageChangeCard } from '@/features/notes/components/panel/AiPageChangeCard';
import { useAiConversations } from '@/features/ai/hooks/useAiConversations';
import { useDeleteAiConversation } from '@/features/ai/hooks/useDeleteAiConversation';
import { buildAiContext } from '@/features/ai/lib/build-ai-context';
import { useAiPageChange } from '@/features/notes/hooks/useAiPageChange';
import { usePage } from '@/features/notes/hooks/use-query';
import { useNotesUiStore } from '@/features/notes/stores/notes-ui.store';
import { aiApi } from '@/services/ai.api';

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
      <AiMascot
        className="h-24 w-24 drop-shadow-[0_12px_20px_rgb(61_31_91/0.16)]"
        alt=""
      />
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

interface AiTabProps {
  pageId: string;
  workspaceId: string;
}

export function AiTab({ pageId, workspaceId }: AiTabProps) {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState(DEFAULT_STATUS);
  const { ref: textareaRef, resize, focusInput, handleKeyDown } = useAutoResizeTextarea();
  const { attachments, error, addFiles, removeAttachment, clearAttachments } =
    useAiAttachments();
  const aiComposerDraft = useNotesUiStore((state) => state.aiComposerDraft);
  const setAiComposerDraft = useNotesUiStore((state) => state.setAiComposerDraft);
  const {
    conversations,
    activeId,
    session,
    actions,
    isLoading,
    isError,
    select,
    startNew,
    remember,
    refetch,
  } = useAiConversations({
    scope: `${workspaceId}:${pageId}`,
  });
  const { remove, isDeleting } = useDeleteAiConversation('NOTES');
  const pageQuery = usePage(pageId);
  const { changedVersion, checkForChange, dismissChange } = useAiPageChange(pageId);
  const stream = useCallback<AiStreamFn>(
    (messages, messageAttachments, options) =>
      aiApi.chatStream(
        messages,
        messageAttachments,
        { ...options, onDone: ({ conversationId }) => remember(conversationId) },
        buildAiContext({ workspaceId, pageId }),
        activeId ?? undefined,
      ),
    [activeId, pageId, remember, workspaceId],
  );
  const onSettled = useCallback(() => {
    setStatus(DEFAULT_STATUS);
    focusInput();
    void checkForChange();
  }, [checkForChange, focusInput]);
  const onTool = useCallback((name: string) => setStatus(toolLabel(name)), []);
  const conversation = useAiConversation({
    streamKey: `notes:${workspaceId}:${pageId}`,
    session,
    actions,
    stream,
    onTool,
    onSettled,
  });

  useEffect(() => {
    if (aiComposerDraft === null) return;
    const draft = aiComposerDraft;
    setAiComposerDraft(null);
    queueMicrotask(() => {
      setInput(draft);
      focusInput();
    });
  }, [aiComposerDraft, focusInput, setAiComposerDraft]);

  useEffect(() => { resize(); }, [input, resize]);

  async function handleSend(text: string) {
    const capturedAttachments = attachments;
    if (isLoading || conversation.loading
      || (!text.trim() && capturedAttachments.length === 0)) return;
    setInput('');
    clearAttachments();
    setStatus(DEFAULT_STATUS);
    await conversation.send(text, capturedAttachments);
  }

  function handleEdit(index: number) {
    setInput(conversation.recall(index));
    focusInput();
  }

  async function handleDelete(id: string): Promise<void> {
    if (activeId === id) startNew();
    await remove(id);
  }

  const messages = session.messages;
  const activeSummary = conversations.find(({ id }) => id === activeId);
  const activeTitle = activeSummary?.title ?? (activeId ? session.title : null);
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden" aria-label="Trợ lý AI">
      <AiConversationBar
        conversations={conversations}
        activeId={activeId}
        activeTitle={activeTitle}
        currentOrigin="NOTES"
        isLoading={isLoading}
        isError={isError}
        onSelect={select}
        onStartNew={startNew}
        onDelete={(id) => void handleDelete(id)}
        isDeleting={isDeleting}
        onRetry={refetch}
      />
      {messages.length === 0 && !conversation.loading ? (
        <AiEmptyState onPick={(prompt) => void handleSend(prompt)} />
      ) : (
        <AiMessageList
          messages={messages}
          loading={conversation.loading}
          pendingUser={conversation.pendingUser}
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
        context={pageQuery.data?.title.trim()
          ? { kind: 'page', label: pageQuery.data.title }
          : undefined}
        attachments={attachments}
        attachmentError={error}
        textareaRef={textareaRef}
        onInputChange={setInput}
        onResize={resize}
        onKeyDown={handleKeyDown}
        onSend={() => void handleSend(input)}
        onStop={conversation.stop}
        onAddFiles={addFiles}
        onRemoveAttachment={removeAttachment}
      />
    </section>
  );
}
