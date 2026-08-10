'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { aiApi } from '@/services/ai.api';
import type { AiAttachment } from '@/features/chat/types/ai-attachment';
import type {
  AiAttachmentMeta,
  AiMessage,
  AiSession,
  AiSessionActions,
} from '@/features/chat/hooks/useAiSessions';

const FALLBACK_ERROR = 'Halo AI chưa trả lời được, bạn gửi lại giúp nhé';

interface UseAiConversationOptions {
  session: AiSession | null;
  actions: AiSessionActions;
  /** Trả con trỏ về ô nhập sau mỗi lượt để gõ tiếp mà không phải click lại. */
  onSettled: () => void;
}

interface UseAiConversationReturn {
  loading: boolean;
  /** Chữ AI đã phát ra ở lượt đang chạy; `null` khi chưa có mẩu nào. */
  streaming: string | null;
  send: (text: string, attachments: AiAttachment[]) => Promise<void>;
  resend: (index: number) => void;
  regenerate: () => void;
  /** Dừng lượt đang stream, giữ lại phần chữ đã nhận. */
  stop: () => void;
  /** Gỡ tin khỏi phiên và trả nội dung để đổ lại vào ô nhập. */
  recall: (index: number) => string;
  discard: (index: number) => void;
}

function toMeta({
  name,
  mimeType,
  size,
  previewUrl,
  base64Data,
}: AiAttachment): AiAttachmentMeta {
  return { name, mimeType, size, previewUrl, data: base64Data };
}

function reasonOf(error: unknown): string {
  return error instanceof Error && error.message ? error.message : FALLBACK_ERROR;
}

/**
 * Một lượt hỏi–đáp với Halo AI, chữ hiện dần theo token.
 * Lỗi trước mẩu chữ đầu tiên gắn vào tin cuối của user (gửi lại được, không phải
 * gõ lại); đứt giữa chừng thì giữ phần đã nhận và đánh dấu `incomplete`.
 */
export function useAiConversation({
  session,
  actions,
  onSettled,
}: UseAiConversationOptions): UseAiConversationReturn {
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState<string | null>(null);

  const draftRef = useRef('');
  const abortRef = useRef<AbortController | null>(null);
  const frameRef = useRef<number | null>(null);

  const cancelFrame = useCallback(() => {
    if (frameRef.current === null) return;
    cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);

  // Token về dày hơn nhiều so với nhịp vẽ. Gom theo frame để không bắt React
  // dựng lại cây Markdown vài chục lần mỗi giây.
  const scheduleFlush = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      setStreaming(draftRef.current);
    });
  }, []);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  const run = useCallback(
    async (sessionId: string, history: AiMessage[]): Promise<void> => {
      const controller = new AbortController();
      abortRef.current = controller;
      draftRef.current = '';
      setStreaming(null);
      setLoading(true);

      try {
        const content = await aiApi.chatStream(
          history,
          history[history.length - 1]?.attachments,
          {
            signal: controller.signal,
            onDelta: (text) => {
              draftRef.current += text;
              scheduleFlush();
            },
          },
        );
        actions.pushMessage(sessionId, { role: 'assistant', content });
      } catch (error) {
        const partial = draftRef.current;
        if (controller.signal.aborted) {
          // Người dùng bấm Dừng: phần đã nhận là câu trả lời họ chấp nhận.
          // Chưa có chữ nào thì bỏ hẳn lượt, không tạo tin rỗng.
          if (partial) actions.pushMessage(sessionId, { role: 'assistant', content: partial });
        } else if (partial) {
          actions.pushMessage(sessionId, {
            role: 'assistant',
            content: partial,
            status: 'incomplete',
            errorMessage: reasonOf(error),
          });
        } else {
          actions.markLastUserFailed(sessionId, reasonOf(error));
        }
      } finally {
        cancelFrame();
        abortRef.current = null;
        draftRef.current = '';
        setStreaming(null);
        setLoading(false);
        onSettled();
      }
    },
    [actions, onSettled, scheduleFlush, cancelFrame],
  );

  const send = useCallback(
    async (text: string, attachments: AiAttachment[]): Promise<void> => {
      const trimmed = text.trim();
      if ((!trimmed && attachments.length === 0) || loading) return;

      const sessionId = session?.id ?? actions.createSession();
      const message: AiMessage = {
        role: 'user',
        content: trimmed,
        ...(attachments.length > 0 ? { attachments: attachments.map(toMeta) } : {}),
      };

      actions.pushMessage(sessionId, message);
      await run(sessionId, [...(session?.messages ?? []), message]);
    },
    [session, actions, loading, run],
  );

  const resend = useCallback(
    (index: number): void => {
      if (!session || loading) return;
      const history = actions.prepareResend(session.id, index);
      if (history.length === 0) return;
      void run(session.id, history);
    },
    [session, actions, loading, run],
  );

  const regenerate = useCallback((): void => {
    if (!session || loading) return;
    const history = actions.dropLastAssistant(session.id);
    if (history.length === 0) return;
    void run(session.id, history);
  }, [session, actions, loading, run]);

  const stop = useCallback((): void => {
    abortRef.current?.abort();
  }, []);

  const recall = useCallback(
    (index: number): string => {
      if (!session || loading) return '';
      return actions.removeMessage(session.id, index)?.content ?? '';
    },
    [session, actions, loading],
  );

  const discard = useCallback(
    (index: number): void => {
      if (!session || loading) return;
      actions.removeMessage(session.id, index);
    },
    [session, actions, loading],
  );

  return { loading, streaming, send, resend, regenerate, stop, recall, discard };
}
