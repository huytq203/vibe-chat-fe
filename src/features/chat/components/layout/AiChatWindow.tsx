'use client';

import { buildAiContext } from '@/features/ai/lib/build-ai-context';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import Draggable, { type DraggableData } from 'react-draggable';
import { Clock, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { AiAvatar } from '@/components/common/BrandAssets';
import { AiChatInput, AiMessageList, useAiConversation } from '@/features/ai';
import type { AiStreamFn } from '@/features/ai';
import { useAiConversations } from '@/features/ai/hooks/useAiConversations';
import { useAutoResizeTextarea } from '@/features/chat/hooks/useAutoResizeTextarea';
import { useAiAttachments } from '@/features/chat/hooks/useAiAttachments';
import { useAiWindowStore } from '@/features/chat/stores/ai-window.store';
import { useDeleteAiConversation } from '@/features/ai/hooks/useDeleteAiConversation';
import { aiApi } from '@/services/ai.api';
import { AiHistoryPanel } from './AiHistoryPanel';

export function AiChatWindow() {
  const isOpen = useAiWindowStore((s) => s.isOpen);
  const position = useAiWindowStore((s) => s.position);
  const close = useAiWindowStore((s) => s.close);
  const setPosition = useAiWindowStore((s) => s.setPosition);

  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const {
    conversations, session, activeId, actions, select, startNew, remember, isLoading,
  } = useAiConversations({ origin: 'CHAT', scope: 'chat' });
  const { remove, isDeleting } = useDeleteAiConversation('CHAT');
  const messages = session.messages;

  const { ref: textareaRef, resize, focusInput, handleKeyDown: handleTextareaKeyDown } =
    useAutoResizeTextarea();

  const { attachments, error: attachmentError, addFiles, removeAttachment, clearAttachments } =
    useAiAttachments();

  const stream = useCallback<AiStreamFn>((history, sentAttachments, options) =>
    aiApi.chatStream(
      history,
      sentAttachments,
      { ...options, onDone: ({ conversationId }) => remember(conversationId) },
      buildAiContext(),
      activeId ?? undefined,
    ), [activeId, remember]);

  const {
    loading, streaming, pendingUser, send, resend, regenerate, stop, recall, discard,
  } = useAiConversation({
    streamKey: `chat:${session.id}`,
    session,
    actions,
    stream,
    onSettled: focusInput,
  });

  const nodeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { resize(); }, [input, resize]);
  useEffect(() => { if (isOpen) focusInput(); }, [isOpen, focusInput]);

  function handleNewChat() {
    startNew();
    setInput('');
    clearAttachments();
    setShowHistory(false);
  }

  async function handleDelete(id: string): Promise<void> {
    if (activeId === id) startNew();
    await remove(id);
  }

  async function handleSend() {
    const captured = attachments;
    if (loading || (!input.trim() && captured.length === 0)) return;
    const text = input;
    setInput('');
    clearAttachments();
    await send(text, captured);
  }

  /** "Sửa": gỡ tin lỗi, đổ nguyên văn về ô nhập để chỉnh rồi gửi lại. */
  function handleEdit(index: number) {
    setInput(recall(index));
    focusInput();
  }

  if (!isOpen || typeof document === 'undefined') return null;

  const card = (
    <div
      ref={nodeRef}
      className="pointer-events-auto fixed bottom-6 right-6 z-60 flex h-[520px] w-[360px] flex-col overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl"
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="ai-drag-handle flex min-w-0 flex-1 cursor-move items-center gap-2">
          <AiAvatar className="h-8 w-8 shadow-subtle ring-1 ring-primary/25" />
          <span className="truncate text-sm font-bold tracking-tight">Halo AI</span>
        </div>
        <div className="no-drag flex shrink-0 items-center gap-0.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={handleNewChat}
            aria-label="Tạo hội thoại mới"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant={showHistory ? 'solid' : 'ghost'}
            className="h-8 w-8"
            onClick={() => setShowHistory((v) => !v)}
            aria-label="Lịch sử hội thoại"
          >
            <Clock className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={close}
            aria-label="Đóng cửa sổ AI"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {showHistory ? (
        <AiHistoryPanel
          conversations={conversations}
          activeId={activeId}
          onSelect={(id) => { select(id); setShowHistory(false); }}
          onDelete={(id) => void handleDelete(id)}
          isDeleting={isDeleting}
        />
      ) : (
        <>
          <AiMessageList
            messages={messages}
            loading={isLoading || loading}
            pendingUser={pendingUser}
            streaming={streaming}
            onRegenerate={regenerate}
            onResend={resend}
            onEdit={handleEdit}
            onDiscard={discard}
          />
          <AiChatInput
            input={input}
            loading={loading}
            attachments={attachments}
            attachmentError={attachmentError}
            textareaRef={textareaRef}
            onInputChange={setInput}
            onResize={resize}
            onKeyDown={handleTextareaKeyDown}
            onSend={() => void handleSend()}
            onStop={stop}
            onAddFiles={addFiles}
            onRemoveAttachment={removeAttachment}
          />
        </>
      )}
    </div>
  );

  return createPortal(
    <Draggable
      nodeRef={nodeRef as RefObject<HTMLElement>}
      handle=".ai-drag-handle"
      cancel=".no-drag"
      position={position}
      onStop={(_e, data: DraggableData) => setPosition(data.x, data.y)}
      bounds="body"
    >
      {card}
    </Draggable>,
    document.body,
  );
}
