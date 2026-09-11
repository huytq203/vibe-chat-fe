'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { getSnapshot, stopStream, subscribe } from '@/features/ai/lib/ai-stream-runner';
import { runAiConversation } from '@/features/ai/lib/run-ai-conversation';
import type { AiAttachment } from '@/features/ai/types';
import type {
  AiAttachmentMeta,
  AiMessage,
  AiSession,
  AiSessionActions,
  AiStreamFn,
} from '@/features/ai/types';

interface UseAiConversationOptions {
  streamKey: string;
  session: AiSession | null;
  actions: AiSessionActions;
  /** Trả con trỏ về ô nhập sau mỗi lượt để gõ tiếp mà không phải click lại. */
  onSettled: () => void;
  /** Mặc định là endpoint chat chung; notes truyền bản đã bind workspace/page. */
  stream?: AiStreamFn;
  /** Model đang chạy công cụ — dùng để đổi dòng trạng thái, không vào lịch sử. */
  onTool?: (name: string) => void;
}

interface UseAiConversationReturn {
  loading: boolean;
  /** Chữ AI đã phát ra ở lượt đang chạy; `null` khi chưa có mẩu nào. */
  streaming: string | null;
  /** Tin user của lượt đang chạy, được runner giữ qua vòng đời component. */
  pendingUser?: AiMessage;
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

function useStreamSnapshot(streamKey: string) {
  const subscribeToStream = useCallback(
    (callback: () => void) => subscribe(streamKey, callback), [streamKey],
  );
  const readSnapshot = useCallback(() => getSnapshot(streamKey), [streamKey]);
  return useSyncExternalStore(subscribeToStream, readSnapshot, readSnapshot);
}

/**
 * Một lượt hỏi–đáp với Halo AI, chữ hiện dần theo token.
 * Lỗi trước mẩu chữ đầu tiên gắn vào tin cuối của user (gửi lại được, không phải
 * gõ lại); đứt giữa chừng thì giữ phần đã nhận và đánh dấu `incomplete`.
 */
export function useAiConversation(
  { streamKey, session, actions, onSettled, stream, onTool }: UseAiConversationOptions,
): UseAiConversationReturn {
  const activeStreamKeyRef = useRef(streamKey);
  useEffect(() => { activeStreamKeyRef.current = streamKey; }, [streamKey]);
  const snapshot = useStreamSnapshot(streamKey);
  const loading = snapshot.status === 'streaming';
  const streaming = loading && snapshot.text ? snapshot.text : null;
  const pendingUser = loading ? snapshot.pendingUser : undefined;

  const run = useCallback(
    (sessionId: string, history: AiMessage[], key = streamKey, pendingUser?: AiMessage) =>
      runAiConversation({
        key, sessionId, history, pendingUser, actions, stream, onTool, onSettled,
      }),
    [actions, onSettled, stream, onTool, streamKey],
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
      const key = session ? streamKey : `chat:${sessionId}`;
      activeStreamKeyRef.current = key;
      await run(sessionId, [...(session?.messages ?? []), message], key, message);
    },
    [session, actions, loading, run, streamKey],
  );

  const resend = useCallback(
    (index: number): void => {
      if (!session || loading) return;
      const history = actions.prepareResend(session.id, index);
      if (history.length === 0) return;
      void run(session.id, history, streamKey, history.at(-1));
    },
    [session, actions, loading, run, streamKey],
  );

  const regenerate = useCallback((): void => {
    if (!session || loading) return;
    const history = actions.dropLastAssistant(session.id);
    if (history.length === 0) return;
    void run(session.id, history);
  }, [session, actions, loading, run]);

  const stop = useCallback((): void => stopStream(activeStreamKeyRef.current), []);

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

  return { loading, streaming, pendingUser, send, resend, regenerate, stop, recall, discard };
}
