'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import Draggable, { type DraggableData } from 'react-draggable';
import { Bot, Clock, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { useAutoResizeTextarea } from '@/features/chat/hooks/useAutoResizeTextarea';
import { useAiAttachments } from '@/features/chat/hooks/useAiAttachments';
import { useAiSessions } from '@/features/chat/hooks/useAiSessions';
import type { AiMessage } from '@/features/chat/hooks/useAiSessions';
import { useAiWindowStore } from '@/features/chat/stores/ai-window.store';
import { callGemini } from '@/lib/gemini';
import { AiHistoryPanel } from './AiHistoryPanel';
import { AiMessageList } from './AiMessageList';
import { AiChatInput } from './AiChatInput';

export function AiChatWindow() {
  const isOpen = useAiWindowStore((s) => s.isOpen);
  const position = useAiWindowStore((s) => s.position);
  const close = useAiWindowStore((s) => s.close);
  const setPosition = useAiWindowStore((s) => s.setPosition);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const { sessions, activeSession, activeId, setActiveId, createSession, pushMessage, deleteSession } =
    useAiSessions();
  const messages = activeSession?.messages ?? [];

  const { ref: textareaRef, resize, focusInput, handleKeyDown: handleTextareaKeyDown } =
    useAutoResizeTextarea();

  const { attachments, error: attachmentError, addFiles, removeAttachment, clearAttachments } =
    useAiAttachments();

  const nodeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { resize(); }, [input, resize]);
  useEffect(() => { if (isOpen) focusInput(); }, [isOpen, focusInput]);

  function handleNewChat() {
    setActiveId(null);
    setInput('');
    setError(null);
    clearAttachments();
    setShowHistory(false);
  }

  async function handleSend() {
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || loading) return;

    let sid = activeId;
    if (!sid) sid = createSession();

    const currentMessages = sessions.find((s) => s.id === sid)?.messages ?? [];
    const capturedAttachments = attachments;

    const userMsg: AiMessage = {
      role: 'user',
      content: trimmed,
      attachments: capturedAttachments.map(({ name, mimeType, size, previewUrl }) => ({
        name,
        mimeType,
        size,
        previewUrl,
      })),
    };
    const nextMessages = [...currentMessages, userMsg];

    pushMessage(sid, userMsg);
    setInput('');
    clearAttachments();
    setLoading(true);
    setError(null);

    try {
      const content = await callGemini(nextMessages, capturedAttachments);
      pushMessage(sid, { role: 'assistant', content });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gửi tin nhắn thất bại');
    } finally {
      setLoading(false);
      focusInput();
    }
  }

  if (!isOpen || typeof document === 'undefined') return null;

  const card = (
    <div
      ref={nodeRef}
      className="pointer-events-auto fixed bottom-6 right-6 z-60 flex h-[520px] w-[360px] flex-col overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl"
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="ai-drag-handle flex min-w-0 flex-1 cursor-move items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-primary/30 bg-primary/15">
            <Bot className="h-4 w-4 text-primary" />
          </div>
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
          sessions={sessions}
          activeId={activeId}
          onSelect={(id) => { setActiveId(id); setShowHistory(false); }}
          onDelete={deleteSession}
        />
      ) : (
        <>
          <AiMessageList messages={messages} loading={loading} error={error} />
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
