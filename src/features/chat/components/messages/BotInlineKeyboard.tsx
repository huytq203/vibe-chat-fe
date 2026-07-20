'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button/Button';
import { useCreateCallback } from '@/features/chat/hooks/use-callback-mutations';
import { readBotReplyMarkup } from '@/features/chat/types/bot-reply-markup';
import type { Message } from '@/features/chat/types';
import { cn } from '@/lib/utils/cn';

type BotInlineKeyboardProps = {
  message: Message;
  isMe: boolean;
  senderUsername?: string | null;
  onLaunchWebapp?: (input: {
    botUsername: string;
    buttonPayload?: string;
  }) => void;
};

export function BotInlineKeyboard({
  message,
  isMe,
  senderUsername,
  onLaunchWebapp,
}: BotInlineKeyboardProps) {
  const replyMarkup = readBotReplyMarkup(message);
  const rows = replyMarkup?.inlineKeyboard ?? [];
  const createCallback = useCreateCallback();
  const [pendingCallbackData, setPendingCallbackData] = useState<string | null>(
    null,
  );

  if (isMe || message.isDeleted || rows.length === 0) return null;

  const handleCallbackClick = (callbackData: string) => {
    if (createCallback.isPending) return;
    setPendingCallbackData(callbackData);
    createCallback.mutate(
      {
        conversationId: message.conversationId,
        messageId: message.id,
        callbackData,
      },
      { onSettled: () => setPendingCallbackData(null) },
    );
  };

  return (
    <div className="mt-1.5 flex max-w-full flex-col gap-1.5">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex max-w-full flex-wrap gap-1.5">
          {row.buttons.map((button) => (
            <Button
              key={`${button.text}:${button.callbackData ?? button.webApp?.url ?? ''}`}
              variant="ghost"
              size="sm"
              type="button"
              disabled={
                createCallback.isPending ||
                Boolean(button.webApp && !(button.webApp.botUsername ?? senderUsername))
              }
              onClick={() => {
                if (button.webApp) {
                  const botUsername = button.webApp.botUsername ?? senderUsername;
                  if (!botUsername) return;
                  onLaunchWebapp?.({
                    botUsername,
                    buttonPayload: button.webApp.startParam,
                  });
                  return;
                }
                if (button.callbackData) handleCallbackClick(button.callbackData);
              }}
              className={cn(
                'inline-flex min-h-8 max-w-full items-center justify-center rounded-md border border-primary/35 bg-background px-3 py-1 text-[12.5px] font-medium text-primary shadow-sm transition-colors',
                'hover:bg-primary/75 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60',
              )}
            >
              <span className="min-w-0 truncate">
                {button.callbackData &&
                pendingCallbackData === button.callbackData &&
                createCallback.isPending
                  ? '...'
                  : button.text}
              </span>
            </Button>
          ))}
        </div>
      ))}
    </div>
  );
}
