'use client';

import { useCallback, useEffect, useRef } from 'react';

import { enhanceCodeBlocks } from '@/features/notes/lib/enhance-code-blocks';
import { NOTE_HTML_FRAME_STYLES } from '@/features/notes/lib/note-html-frame-styles';
import { cn } from '@/lib/utils/cn';

const SEMANTIC_COLORS = [
  'background',
  'foreground',
  'muted',
  'muted-foreground',
  'border',
  'primary',
  'danger',
  'success',
];

function resizeFrame(frame: HTMLIFrameElement) {
  const frameDocument = frame.contentDocument;
  if (!frameDocument) return;
  const height = Math.max(
    frameDocument.body.scrollHeight,
    frameDocument.documentElement.scrollHeight,
  );
  frame.style.height = `${Math.ceil(height)}px`;
}

interface NoteHtmlFrameProps {
  /** HTML server dựng, vẫn coi là dữ liệu không tin cậy. */
  html: string;
  title: string;
  /** CSS bổ sung chèn sau CSS định dạng gốc. */
  extraStyles?: string;
  className?: string;
}

export function NoteHtmlFrame({ html, title, extraStyles = '', className }: NoteHtmlFrameProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const prepareFrame = useCallback((frame: HTMLIFrameElement) => {
    const frameDocument = frame.contentDocument;
    if (!frameDocument) return;

    const parentStyles = window.getComputedStyle(frame);
    const rootStyles = frameDocument.documentElement.style;
    for (const token of SEMANTIC_COLORS) {
      rootStyles.setProperty(`--public-${token}`, parentStyles.getPropertyValue(`--${token}`));
    }
    rootStyles.colorScheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

    resizeObserverRef.current?.disconnect();
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserverRef.current = new ResizeObserver(() => resizeFrame(frame));
      resizeObserverRef.current.observe(frameDocument.body);
      resizeObserverRef.current.observe(frameDocument.documentElement);
    }
    resizeFrame(frame);
    void enhanceCodeBlocks(frame).finally(() => resizeFrame(frame));
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const resize = () => resizeFrame(frame);
    // `srcDoc` có thể tải xong trước hydration nên onLoad đơn lẻ sẽ bị bỏ lỡ.
    prepareFrame(frame);
    const hydrationChecks = [0, 120, 500].map((delay) =>
      window.setTimeout(() => prepareFrame(frame), delay),
    );
    window.addEventListener('resize', resize);
    return () => {
      hydrationChecks.forEach((timer) => window.clearTimeout(timer));
      resizeObserverRef.current?.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [html, extraStyles, prepareFrame]);

  return (
    // HTML người dùng vẫn chạy trong iframe không có allow-scripts. Chỉ parent
    // cùng origin gắn hành vi copy và syntax spans vào DOM đã bị sandbox.
    <iframe
      ref={frameRef}
      title={title}
      sandbox="allow-same-origin"
      referrerPolicy="no-referrer"
      srcDoc={`<style>${NOTE_HTML_FRAME_STYLES}${extraStyles}</style>${html}`}
      onLoad={(event) => prepareFrame(event.currentTarget)}
      className={cn('block h-40 min-h-40 w-full overflow-hidden border-0 bg-transparent', className)}
    />
  );
}
