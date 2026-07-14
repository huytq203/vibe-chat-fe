'use client';

import { useMemo, type ReactNode } from 'react';
import { Text } from '@/components/ui/typography/Typography';
import { useMessageDraftCommandStore } from '@/features/chat/stores/message-draft-command.store';
import { cn } from '@/lib/utils/cn';

const COMMAND_REGEX = /(^|\s)(\/[A-Za-z][A-Za-z0-9_]*(?:@[A-Za-z0-9_]+)?)/g;
const COMMAND_DETECT_REGEX = /(^|\s)\/[A-Za-z][A-Za-z0-9_]*(?:@[A-Za-z0-9_]+)?/;

type BotCommandTextProps = {
  conversationId: string;
  text: string;
  className?: string;
  isMe?: boolean;
};

export function hasBotCommand(text: string): boolean {
  return COMMAND_DETECT_REGEX.test(text);
}

function splitCommandText(text: string, conversationId: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  COMMAND_REGEX.lastIndex = 0;
  while ((match = COMMAND_REGEX.exec(text)) !== null) {
    const prefix = match[1] ?? '';
    const command = match[2] ?? '';
    const commandStart = match.index + prefix.length;

    if (commandStart > last) nodes.push(text.slice(last, commandStart));
    nodes.push(
      <CommandLink
        key={`${command}-${commandStart}`}
        conversationId={conversationId}
        command={command}
      />,
    );
    last = commandStart + command.length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function CommandLink({
  conversationId,
  command,
}: {
  conversationId: string;
  command: string;
}) {
  const setDraftCommand = useMessageDraftCommandStore((s) => s.setDraftCommand);

  function pasteCommand() {
    setDraftCommand(conversationId, command);
  }

  return (
    <Text
      as="span"
      role="link"
      tabIndex={0}
      color="primary"
      weight="semibold"
      strong
      className={cn(
        'inline cursor-pointer align-baseline',
        'text-primary',
        'underline decoration-primary/35 underline-offset-2',
        'transition-colors  hover:decoration-primary',
        'focus:outline-none focus:ring-2 focus:ring-primary/35',
      )}
      onClick={(event) => {
        event.stopPropagation();
        pasteCommand();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        pasteCommand();
      }}
      aria-label={`Dán lệnh ${command} vào ô nhập`}
      data-command={command}
      title="Bấm để dán lệnh vào ô nhập"
    >
      {command}
    </Text>
  );
}

export function BotCommandText({
  conversationId,
  text,
  className,
  isMe,
}: BotCommandTextProps) {
  const nodes = useMemo(
    () => splitCommandText(text, conversationId),
    [conversationId, text],
  );

  return (
    <span
      className={cn(
        className,
        isMe &&
          '[&_[data-command]]:border-white/30 [&_[data-command]]:bg-white/15 [&_[data-command]]:text-white [&_[data-command]]:decoration-white/70',
      )}
    >
      {nodes}
    </span>
  );
}
