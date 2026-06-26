"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Bot, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button/Button";
import { useChatUIStore } from "@/features/chat/stores/chat-ui.store";
import { ComboBox } from "@/components/ui/combobox/ComboBox";
import { useAutoResizeTextarea } from "@/features/chat/hooks/useAutoResizeTextarea";
import { useAiAttachments } from "@/features/chat/hooks/useAiAttachments";
import { AiHistoryPanel } from "./AiHistoryPanel";
import { AiMessageList } from "./AiMessageList";
import { AiChatInput } from "./AiChatInput";
import { useAiSessions } from "@/features/chat/hooks/useAiSessions";
import type { AiMessage } from "@/features/chat/hooks/useAiSessions";
import {
  callGemini,
  fetchGeminiModels,
  GEMINI_FREE_MODELS,
  type GeminiModelInfo,
} from "@/lib/gemini";

const MODEL_STORAGE_KEY = "ai-panel-model";

function loadModel(): string {
  if (typeof window === "undefined") return GEMINI_FREE_MODELS[0].value;
  return localStorage.getItem(MODEL_STORAGE_KEY) ?? GEMINI_FREE_MODELS[0].value;
}

export function AiChatPanel() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<string>(loadModel);
  const [modelOptions, setModelOptions] = useState<GeminiModelInfo[]>(GEMINI_FREE_MODELS);
  const [loadingModels, setLoadingModels] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const { sessions, activeSession, activeId, setActiveId, createSession, pushMessage, deleteSession } =
    useAiSessions();
  const setActiveSection = useChatUIStore((s) => s.setActiveSection);
  const messages = activeSession?.messages ?? [];

  const { ref: textareaRef, resize, focusInput, handleKeyDown: handleTextareaKeyDown } =
    useAutoResizeTextarea();

  const { attachments, error: attachmentError, addFiles, removeAttachment, clearAttachments } =
    useAiAttachments();

  useEffect(() => {
    // loadingModels khởi tạo true → chỉ set false sau khi fetch xong (setState async
    // trong .then là hợp lệ, tránh setState đồng bộ trong effect).
    void fetchGeminiModels().then((models) => {
      setModelOptions(models);
      setLoadingModels(false);
    });
  }, []);

  useEffect(() => { resize(); }, [input, resize]);
  useEffect(() => { focusInput(); }, [focusInput]);

  function handleModelChange(value: string | string[]) {
    const next = Array.isArray(value) ? (value[0] ?? model) : value;
    setModel(next);
    try { localStorage.setItem(MODEL_STORAGE_KEY, next); } catch { /* ignore */ }
  }

  function handleNewChat() {
    setActiveId(null);
    setInput("");
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
      role: "user",
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
    setInput("");
    clearAttachments();
    setLoading(true);
    setError(null);

    try {
      const content = await callGemini(model, nextMessages, capturedAttachments);
      pushMessage(sid, { role: "assistant", content });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gửi tin nhắn thất bại");
    } finally {
      setLoading(false);
      focusInput();
    }
  }

  return (
    <aside className="flex flex-col h-full w-full shrink-0 border-r border-border bg-sidebar text-sidebar-foreground md:w-[300px] md:min-w-[260px]">
      <header className="flex flex-col gap-2.5 px-4 pb-3 pt-[18px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setActiveSection('chat')}
              aria-label="Quay lại danh sách hội thoại"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-primary/30 bg-primary/15">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight">Halo AI</span>
          </div>
          <div className="flex items-center gap-0.5">
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
              variant={showHistory ? "solid" : "ghost"}
              className="h-8 w-8"
              onClick={() => setShowHistory((v) => !v)}
              aria-label="Lịch sử hội thoại"
            >
              <Clock className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {!showHistory && (
          <ComboBox
            clearIcon={false}
            options={loadingModels ? [{ label: "Đang tải...", value: model }] : modelOptions}
            value={model}
            onValueChange={handleModelChange}
            autocomplete={false}
          />
        )}
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
    </aside>
  );
}
