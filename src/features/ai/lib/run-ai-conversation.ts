import { aiApi } from '@/services/ai.api';
import { startStream, type AiStreamResult } from '@/features/ai/lib/ai-stream-runner';
import type { AiMessage, AiSessionActions, AiStreamFn } from '@/features/ai/types';

const FALLBACK_ERROR = 'Halo AI chưa trả lời được, bạn gửi lại giúp nhé';

interface RunAiConversationOptions {
  key: string;
  sessionId: string;
  history: AiMessage[];
  pendingUser?: AiMessage;
  actions: AiSessionActions;
  stream?: AiStreamFn;
  onTool?: (name: string) => void;
  onSettled: () => void;
}

export interface AiConversationPersistence {
  persist: (user: AiMessage, result: AiStreamResult) => Promise<string | null>;
  onPersisted: (conversationId: string) => void;
  isMounted: () => boolean;
}

type PendingTurn = { user: AiMessage; persistence: AiConversationPersistence };

const persistenceByActions = new WeakMap<AiSessionActions, AiConversationPersistence>();
const pendingTurns = new Map<string, PendingTurn>();

export function registerAiConversationPersistence(
  actions: AiSessionActions,
  persistence: AiConversationPersistence,
): () => void {
  persistenceByActions.set(actions, persistence);
  return () => {
    if (persistenceByActions.get(actions) === persistence) persistenceByActions.delete(actions);
  };
}

function reasonOf(error: unknown): string {
  return error instanceof Error && error.message ? error.message : FALLBACK_ERROR;
}

function finishRun(result: AiStreamResult, sessionId: string, actions: AiSessionActions): void {
  if (result.status === 'done') {
    if (result.text) {
      actions.pushMessage(sessionId, { role: 'assistant', content: result.text });
    } else {
      actions.markLastUserFailed(sessionId, FALLBACK_ERROR);
    }
  } else if (result.status === 'aborted') {
    if (result.text) {
      actions.pushMessage(sessionId, { role: 'assistant', content: result.text });
    } else {
      actions.markLastUserFailed(sessionId, FALLBACK_ERROR);
    }
  } else if (result.text) {
    actions.pushMessage(sessionId, {
      role: 'assistant',
      content: result.text,
      status: 'incomplete',
      errorMessage: reasonOf(result.error),
    });
  } else {
    actions.markLastUserFailed(sessionId, reasonOf(result.error));
  }
}

function persistFinishedTurn(key: string, result: AiStreamResult): void {
  const pending = pendingTurns.get(key);
  pendingTurns.delete(key);
  if (!pending) return;
  void pending.persistence.persist(pending.user, result)
    .then((id) => { if (id) pending.persistence.onPersisted(id); })
    .catch(() => undefined);
}

export async function runAiConversation(options: RunAiConversationOptions): Promise<void> {
  const send = options.stream ?? aiApi.chatStream;
  const persistence = persistenceByActions.get(options.actions);
  if (persistence && options.pendingUser) {
    pendingTurns.set(options.key, { user: options.pendingUser, persistence });
  }
  await startStream(options.key, {
    run: (onDelta, signal) => send(
      options.history,
      options.history[options.history.length - 1]?.attachments,
      { signal, onDelta, onTool: options.onTool },
    ),
    onFinish: (result) => {
      persistFinishedTurn(options.key, result);
      finishRun(result, options.sessionId, options.actions);
      if (!persistence || persistence.isMounted()) options.onSettled();
    },
  });
}
