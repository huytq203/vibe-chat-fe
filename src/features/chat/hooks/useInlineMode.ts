'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiAuth } from '@/lib/api/client';
import { getSocket } from '@/lib/ws/socket';
import { usersApi } from '@/services/users.api';
import { userKeys } from '@/services/keys';
import type {
  ConversationType,
  InlineResult,
  InlineResultsPayload,
  InlineSelectionSend,
  MessageType,
} from '@/features/chat/types';

type InlineAck =
  | { ok: true; queryId: string }
  | { ok: false; error?: string; message?: string };

const INLINE_QUERY_TIMEOUT_MS = 8_000;

function parseInlineDraft(text: string):
  | { prefix: string; query: string; hasQuery: boolean }
  | null {
  const match = text.match(/^@([a-zA-Z0-9_]{1,50})(?:\s+(.*))?$/);
  if (!match) return null;
  return {
    prefix: match[1],
    query: match[2] ?? '',
    hasQuery: match[2] !== undefined,
  };
}

function messageTypeForInline(result: InlineResult): MessageType {
  if (!result.mediaId) return 'TEXT';
  if (result.type === 'photo') return 'IMAGE';
  if (result.type === 'video') return 'VIDEO';
  if (result.type === 'audio' || result.type === 'voice') return 'AUDIO';
  if (result.type === 'sticker') return 'STICKER';
  return 'FILE';
}

function textForInline(result: InlineResult): string | undefined {
  if (result.type === 'location' && result.latitude != null && result.longitude != null) {
    return `Vị trí: ${result.latitude}, ${result.longitude}`;
  }
  if (result.type === 'contact') {
    const name = [result.firstName, result.lastName].filter(Boolean).join(' ');
    return [name, result.phoneNumber].filter(Boolean).join(' - ') || undefined;
  }
  return (
    result.messageText ??
    result.caption ??
    result.title ??
    result.description ??
    result.url
  );
}

export function useInlineMode(input: {
  conversationId: string;
  conversationType: ConversationType;
  plaintext: string;
  disabled?: boolean;
}) {
  const parsed = useMemo(() => parseInlineDraft(input.plaintext), [input.plaintext]);
  const prefix = parsed?.prefix ?? '';
  const [activeQueryId, setActiveQueryId] = useState<string | null>(null);
  const [results, setResults] = useState<InlineResult[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeQueryRef = useRef<string | null>(null);

  const botsQuery = useQuery({
    queryKey: userKeys.inlineBots(prefix.toLowerCase()),
    queryFn: () => usersApi.searchInlineBots({ prefix }),
    enabled: !input.disabled && prefix.length > 0,
    staleTime: 30_000,
  });

  const bots = botsQuery.data?.items ?? [];
  const bot =
    bots.find((b) => b.username.toLowerCase() === prefix.toLowerCase()) ?? null;

  useEffect(() => {
    const socket = getSocket(apiAuth.getToken());
    if (!socket) return;
    const handler = (payload: InlineResultsPayload) => {
      if (payload.chatUuid !== input.conversationId) return;
      if (payload.queryId !== activeQueryRef.current) return;
      setResults(payload.results);
      setIsQuerying(false);
    };
    socket.on('inline:results', handler);
    return () => {
      socket.off('inline:results', handler);
    };
  }, [input.conversationId]);

  useEffect(() => {
    if (input.disabled || !parsed?.hasQuery || !bot) {
      const resetTimer = setTimeout(() => {
        activeQueryRef.current = null;
        setActiveQueryId(null);
        setResults([]);
        setIsQuerying(false);
        setError(null);
      }, 0);
      return () => clearTimeout(resetTimer);
    }

    const queryText = parsed.query.trim();
    if (!queryText) {
      const resetTimer = setTimeout(() => {
        setResults([]);
        setIsQuerying(false);
      }, 0);
      return () => clearTimeout(resetTimer);
    }

    const timer = setTimeout(() => {
      const socket = getSocket(apiAuth.getToken());
      if (!socket?.connected) {
        setError('Chưa có kết nối realtime');
        setIsQuerying(false);
        return;
      }
      setIsQuerying(true);
      setError(null);
      socket
        .timeout(INLINE_QUERY_TIMEOUT_MS)
        .emitWithAck('inline:query', {
          botUsername: bot.username,
          query: queryText,
          offset: '',
          chatUuid: input.conversationId,
          chatType: input.conversationType,
        })
        .then((ack: InlineAck) => {
          if (!ack || ack.ok !== true) {
            throw new Error(ack?.message ?? ack?.error ?? 'Bot inline chưa sẵn sàng');
          }
          activeQueryRef.current = ack.queryId;
          setActiveQueryId(ack.queryId);
          setResults([]);
        })
        .catch((err: Error) => {
          activeQueryRef.current = null;
          setActiveQueryId(null);
          setResults([]);
          setError(err.message);
          setIsQuerying(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [
    bot,
    input.conversationId,
    input.conversationType,
    input.disabled,
    parsed?.hasQuery,
    parsed?.query,
  ]);

  function buildSelection(result: InlineResult): InlineSelectionSend | null {
    if (!bot || !activeQueryId) return null;
    const type = messageTypeForInline(result);
    const text = textForInline(result);
    return {
      viaBotId: bot.keycloakId,
      inlineQueryId: activeQueryId,
      inlineResultId: result.id,
      inlineQuery: parsed?.query.trim() ?? '',
      type,
      plaintext: text,
      attachmentIds: result.mediaId ? [result.mediaId] : undefined,
      metadata: {
        inline: {
          botUsername: bot.username,
          resultType: result.type,
          title: result.title,
          description: result.description,
          url: result.url,
          thumbnailUrl: result.thumbnailUrl,
        },
      },
    };
  }

  return {
    parsed,
    bots,
    bot,
    results,
    isSearchingBots: botsQuery.isFetching,
    isQuerying,
    error,
    showBotSuggestions: Boolean(parsed && !parsed.hasQuery),
    showResults: Boolean(parsed?.hasQuery && bot),
    buildSelection,
  };
}
