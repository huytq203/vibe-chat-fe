'use client';

import { useState, type KeyboardEvent } from 'react';
import { Clock, Image as ImageIcon, Paperclip, Send, Smile, Video } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { Alert, AlertDescription } from '@/components/ui/alert/Alert';
import { cn } from '@/lib/utils/cn';
import { useSendMessage } from '../hooks/use-mutations';

type MessageInputProps = {
  conversationId: string;
  disabled?: boolean;
};

export function MessageInput({ conversationId, disabled }: MessageInputProps) {
  const [text, setText] = useState('');
  const send = useSendMessage();

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || send.isPending || disabled) return;
    send.mutate(
      {
        conversationId,
        plaintext: trimmed,
        clientNonce: crypto.randomUUID(),
        type: 'TEXT',
      },
      { onSuccess: () => setText('') },
    );
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const hasText = text.trim().length > 0;

  return (
    <div className="shrink-0 border-t border-border bg-sidebar px-4 py-3">
      {send.error && (
        <Alert variant="destructive" className="mb-2 py-2 text-[12px]">
          <AlertDescription>Gửi thất bại — {send.error.message}</AlertDescription>
        </Alert>
      )}
      <div className="flex items-end gap-1.5 rounded-2xl border border-border bg-muted px-2 py-1.5">
        <div className="flex items-center">
          <Button variant="ghost" size="icon-sm" title="Gửi ảnh" aria-label="Gửi ảnh" className="text-muted-foreground hover:text-primary">
            <ImageIcon className="h-[18px] w-[18px]" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="Gửi video" aria-label="Gửi video" className="text-muted-foreground hover:text-primary">
            <Video className="h-[18px] w-[18px]" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="Gửi tệp" aria-label="Gửi tệp" className="text-muted-foreground hover:text-primary">
            <Paperclip className="h-[18px] w-[18px]" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="Tin nhắn hẹn giờ" aria-label="Tin nhắn hẹn giờ" className="text-warning hover:text-warning">
            <Clock className="h-[18px] w-[18px]" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="Emoji" aria-label="Emoji" className="text-muted-foreground hover:text-primary">
            <Smile className="h-[18px] w-[18px]" />
          </Button>
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Nhập tin nhắn..."
          rows={1}
          disabled={disabled}
          maxLength={5000}
          className={cn(
            'min-h-[36px] max-h-32 resize-none border-0 bg-transparent px-1.5 py-1 text-[13.5px] shadow-none',
            'focus-visible:ring-0 focus:border-transparent',
          )}
        />
        <Button
          variant={hasText ? 'solid' : 'ghost'}
          size="icon-sm"
          onClick={submit}
          disabled={!hasText || send.isPending}
          isLoading={send.isPending}
          aria-label="Gửi"
          title="Gửi"
          className="shrink-0"
        >
          {!send.isPending && <Send className="h-[18px] w-[18px]" />}
        </Button>
      </div>
    </div>
  );
}
