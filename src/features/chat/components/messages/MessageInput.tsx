'use client';

import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { Clock, Image as ImageIcon, Paperclip, Send, Smile, Video } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Alert, AlertDescription } from '@/components/ui/alert/Alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover/Popover';
import { EmojiPicker, prefetchEmojiPicker } from '@/components/common/EmojiPicker';
import { cn } from '@/lib/utils/cn';
import { emojiToUrl } from '@/lib/utils/emoji';
import { apiAuth } from '@/lib/api/client';
import { getSocket } from '@/lib/ws/socket';
import { useSendMessage } from '../../hooks/use-mutations';

const TYPING_STOP_DEBOUNCE_MS = 3_000;
const MAX_LENGTH = 5000;

// Walk the contenteditable DOM → plain text string.
// text nodes → raw text, <img data-emoji> → alt (the emoji char), <br> → \n
function extractText(el: HTMLElement): string {
  let text = '';
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? '';
    } else if (node.nodeName === 'IMG') {
      text += (node as HTMLImageElement).alt;
    } else if (node.nodeName === 'BR') {
      text += '\n';
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const inner = extractText(node as HTMLElement);
      text += inner;
      if (inner && ['DIV', 'P'].includes(node.nodeName)) text += '\n';
    }
  });
  return text;
}

type MessageInputProps = {
  conversationId: string;
  disabled?: boolean;
};

export function MessageInput({ conversationId, disabled }: MessageInputProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [hasContent, setHasContent] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const send = useSendMessage();
  const typingStateRef = useRef<'start' | 'stop'>('stop');
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear editor and stop typing when conversation changes
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
      setHasContent(false);
    }
    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      if (typingStateRef.current === 'start') {
        const socket = getSocket(apiAuth.getToken());
        if (socket?.connected) socket.emit('typing', { conversationId, state: 'stop' });
        typingStateRef.current = 'stop';
      }
    };
  }, [conversationId]);

  function emitTyping(state: 'start' | 'stop') {
    if (typingStateRef.current === state) return;
    const socket = getSocket(apiAuth.getToken());
    if (!socket?.connected) { typingStateRef.current = state; return; }
    socket.emit('typing', { conversationId, state });
    typingStateRef.current = state;
  }

  function scheduleStop() {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = setTimeout(() => emitTyping('stop'), TYPING_STOP_DEBOUNCE_MS);
  }

  function syncHasContent() {
    const el = editorRef.current;
    if (!el) return false;
    const text = extractText(el);
    const has = text.trim().length > 0;
    setHasContent(has);
    return has;
  }

  function handleInput() {
    const el = editorRef.current;
    if (!el) return;
    const text = extractText(el);
    const has = text.trim().length > 0;
    setHasContent(has);
    if (disabled) return;
    if (has) { emitTyping('start'); scheduleStop(); }
    else { if (stopTimerRef.current) clearTimeout(stopTimerRef.current); emitTyping('stop'); }
  }

  function handleKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Insert <br> for newline instead of default div-wrapping
        e.preventDefault();
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          const br = document.createElement('br');
          range.insertNode(br);
          range.setStartAfter(br);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          syncHasContent();
        }
      } else {
        e.preventDefault();
        submit();
      }
      return;
    }
    // Enforce max length for printable keys
    if (!e.ctrlKey && !e.metaKey && e.key.length === 1) {
      const el = editorRef.current;
      if (el && extractText(el).length >= MAX_LENGTH) e.preventDefault();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const plain = e.clipboardData.getData('text/plain');
    if (!plain) return;
    const el = editorRef.current;
    const currentLen = el ? extractText(el).length : 0;
    const truncated = plain.slice(0, MAX_LENGTH - currentLen);
    if (!truncated) return;
    // insertText is deprecated but still the most compatible way for contenteditable
    document.execCommand('insertText', false, truncated);
    syncHasContent();
  }

  function submit() {
    const el = editorRef.current;
    if (!el || disabled) return;
    const text = extractText(el).trim();
    if (!text) return;
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    emitTyping('stop');
    el.innerHTML = '';
    setHasContent(false);
    send.mutate({ conversationId, plaintext: text, clientNonce: crypto.randomUUID(), type: 'TEXT' });
  }

  // Save cursor position just before the emoji picker opens
  function handleEmojiButtonClick() {
    const sel = window.getSelection();
    savedRangeRef.current = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
    setEmojiOpen((v) => !v);
  }

  function handleEmojiSelect(emoji: string) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();

    // Restore saved cursor, or place at end
    const sel = window.getSelection();
    const range = savedRangeRef.current ?? (() => {
      const r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(false);
      return r;
    })();
    savedRangeRef.current = null;
    if (sel) { sel.removeAllRanges(); sel.addRange(range); }

    range.deleteContents();

    const url = emojiToUrl(emoji);
    if (url) {
      const img = document.createElement('img');
      img.src = url;
      img.alt = emoji;
      img.title = emoji;
      img.className = 'inline-block h-[1.2em] w-[1.2em] align-[-0.2em]';
      img.setAttribute('draggable', 'false');
      range.insertNode(img);
      range.setStartAfter(img);
    } else {
      const node = document.createTextNode(emoji);
      range.insertNode(node);
      range.setStartAfter(node);
    }

    range.collapse(true);
    if (sel) { sel.removeAllRanges(); sel.addRange(range); }
    syncHasContent();
  }

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
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger>
              <Button
                variant="ghost"
                size="icon-sm"
                title="Emoji"
                aria-label="Emoji"
                className="text-muted-foreground hover:text-primary"
                onMouseEnter={prefetchEmojiPicker}
                onFocus={prefetchEmojiPicker}
                onClick={handleEmojiButtonClick}
              >
                <Smile className="h-[18px] w-[18px]" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" sideOffset={8} showArrow={false} className="w-auto p-0">
              <EmojiPicker onSelect={handleEmojiSelect} />
            </PopoverContent>
          </Popover>
        </div>

        {/* Contenteditable editor with absolute placeholder */}
        <div className="relative min-h-[32px] flex-1">
          {!hasContent && (
            <span className="pointer-events-none absolute left-1.5 top-[5px] select-none text-[13.5px] text-muted-foreground">
              Nhập tin nhắn...
            </span>
          )}
          <div
            ref={editorRef}
            contentEditable={disabled ? 'false' : 'true'}
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKey}
            onPaste={handlePaste}
            role="textbox"
            aria-multiline="true"
            aria-label="Nhập tin nhắn"
            className={cn(
              'min-h-[32px] max-h-32 overflow-y-auto px-1.5 py-[5px] text-[13.5px] leading-relaxed',
              'whitespace-pre-wrap break-words outline-none',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          />
        </div>

        {hasContent && (
          <Button
            variant="solid"
            size="icon-sm"
            onClick={submit}
            aria-label="Gửi"
            title="Gửi"
            className="shrink-0"
          >
            <Send className="h-[18px] w-[18px]" />
          </Button>
        )}
      </div>
    </div>
  );
}
