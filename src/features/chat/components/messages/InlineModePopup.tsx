'use client';

import { Bot, Loader2 } from 'lucide-react';
import type {
  InlineBotSummary,
  InlineResult,
} from '@/features/chat/types';
import { cn } from '@/lib/utils/cn';

type InlineModePopupProps = {
  botSuggestions: InlineBotSummary[];
  results: InlineResult[];
  showBotSuggestions: boolean;
  showResults: boolean;
  isSearchingBots: boolean;
  isQuerying: boolean;
  error: string | null;
  onSelectBot: (bot: InlineBotSummary) => void;
  onSelectResult: (result: InlineResult) => void;
};

function resultSubtitle(result: InlineResult): string {
  return (
    result.description ??
    result.messageText ??
    result.caption ??
    result.url ??
    result.type
  );
}

export function InlineModePopup({
  botSuggestions,
  results,
  showBotSuggestions,
  showResults,
  isSearchingBots,
  isQuerying,
  error,
  onSelectBot,
  onSelectResult,
}: InlineModePopupProps) {
  if (!showBotSuggestions && !showResults) return null;

  const hasLoading = isSearchingBots || isQuerying;
  return (
    <div className="mb-2 max-h-72 overflow-hidden rounded-xl border border-border bg-background shadow-lg">
      {hasLoading && (
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Đang hỏi bot...
        </div>
      )}
      {error && (
        <div className="px-3 py-2 text-xs font-medium text-danger">{error}</div>
      )}
      {showBotSuggestions && botSuggestions.length > 0 && (
        <div className="max-h-64 overflow-y-auto py-1">
          {botSuggestions.map((bot) => (
            <button
              key={bot.keycloakId}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted"
              onClick={() => onSelectBot(bot)}
            >
              {bot.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- avatar presigned URL nhỏ, component chat đang dùng img ở nhiều nơi.
                <img
                  src={bot.avatarUrl}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {bot.displayName}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  @{bot.username}
                  {bot.inlinePlaceholder ? ` - ${bot.inlinePlaceholder}` : ''}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
      {showResults && results.length > 0 && (
        <div className="max-h-64 overflow-y-auto py-1">
          {results.map((result) => (
            <button
              key={result.id}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted"
              onClick={() => onSelectResult(result)}
            >
              {result.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- thumbnail từ bot đã được BE lọc https.
                <img
                  src={result.thumbnailUrl}
                  alt=""
                  className="h-10 w-10 rounded-md object-cover"
                />
              ) : (
                <span
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-md',
                    'bg-primary/10 text-primary',
                  )}
                >
                  <Bot className="h-4 w-4" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {result.title ?? result.messageText ?? result.type}
                </span>
                <span className="line-clamp-2 text-xs text-muted-foreground">
                  {resultSubtitle(result)}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
      {showResults && !hasLoading && !error && results.length === 0 && (
        <div className="px-3 py-2 text-xs text-muted-foreground">
          Chưa có kết quả từ bot
        </div>
      )}
    </div>
  );
}
