'use client';

import { SendHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { readBotReplyMarkup } from '@/features/chat/types/bot-reply-markup';
import type { Message } from '@/features/chat/types';
import { useSendMessage } from '@/features/chat/hooks/use-mutations';
import { cn } from '@/lib/utils/cn';

type BotQuickRepliesProps = {
  message: Message;
  isMe: boolean;
};

export function BotQuickReplies({ message, isMe }: BotQuickRepliesProps) {
  const replyMarkup = readBotReplyMarkup(message);
  const quickReplies = replyMarkup?.quickReplies ?? [];
  const sendMessage = useSendMessage();

  if (isMe || message.isDeleted || quickReplies.length === 0) return null;

  return (
    <div className="mt-1.5 flex max-w-full flex-wrap gap-1.5">
      {quickReplies.map((reply) => {
        const plaintext = reply.value ?? reply.text;
        return (
          <Button
            key={`${reply.text}:${plaintext}`}
            variant="ghost"
            size="sm"
            type="button"
            disabled={sendMessage.isPending}
            onClick={() =>
              sendMessage.mutate({
                conversationId: message.conversationId,
                plaintext,
                type: 'TEXT',
                replyToMessageId: message.id,
              })
            }
            className={cn(
              'inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full border border-primary/35 bg-background px-3 py-1 text-[12.5px] font-medium text-primary shadow-sm transition-colors',
              'hover:bg-primary/75 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60',
            )}
          >
            <span className="min-w-0 truncate">{reply.text}</span>
            <SendHorizontal className="h-3.5 w-3.5 shrink-0" />
          </Button>
        );
      })}
    </div>
  );
}
