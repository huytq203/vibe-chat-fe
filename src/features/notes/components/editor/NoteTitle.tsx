'use client';

import {
  type ChangeEvent,
  type KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import { UndoManager } from 'yjs';

import { type TitlePage, useYTitleValue } from '@/features/notes/hooks/use-title';
import type { YDoc } from '@/lib/collab';

interface NoteTitleProps {
  doc: YDoc;
  editable: boolean;
  onMoveToBody: () => void;
  page: TitlePage;
}

type YTitle = ReturnType<YDoc['getText']>;

function replaceTitle(title: YTitle, value: string, origin: UndoManager): void {
  title.doc?.transact(() => {
    title.delete(0, title.length);
    if (value) title.insert(0, value);
  }, origin);
}

export function NoteTitle({ doc, editable, onMoveToBody, page }: NoteTitleProps) {
  const title = doc.getText('title');
  const value = useYTitleValue(title, page);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const undoManager = useMemo(() => {
    const manager = new UndoManager(title);
    manager.addTrackedOrigin(manager);
    return manager;
  }, [title]);

  useEffect(() => () => undoManager.destroy(), [undoManager]);

  useLayoutEffect(() => {
    const element = titleRef.current;
    if (!element) return;

    const resize = () => {
      element.style.height = 'auto';
      if (element.scrollHeight > 0) element.style.height = `${element.scrollHeight}px`;
    };
    resize();

    const observer = new ResizeObserver(resize);
    if (element.parentElement) observer.observe(element.parentElement);
    return () => observer.disconnect();
  }, [value]);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    if (editable) replaceTitle(title, event.currentTarget.value, undoManager);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const key = event.key.toLowerCase();
    const hasModifier = event.ctrlKey || event.metaKey;
    if (hasModifier && key === 'a') {
      event.preventDefault();
      event.currentTarget.select();
      return;
    }
    if (editable && hasModifier && key === 'z') {
      event.preventDefault();
      if (event.shiftKey) undoManager.redo();
      else undoManager.undo();
      return;
    }
    if (editable && hasModifier && key === 'y') {
      event.preventDefault();
      undoManager.redo();
      return;
    }
    if (event.key !== 'Enter' && event.key !== 'Tab') return;
    event.preventDefault();
    onMoveToBody();
  };

  return (
    <textarea
      ref={titleRef}
      aria-label="Tiêu đề trang"
      className="block min-h-10 w-full resize-none overflow-hidden whitespace-pre-wrap border-0 bg-transparent px-[var(--note-content-gutter)] py-0 font-display text-[32px] font-bold leading-10 tracking-[-0.02em] text-foreground outline-none [field-sizing:content] [overflow-wrap:anywhere] placeholder:text-muted-foreground focus-visible:ring-0 md:min-h-11 md:text-[36px] md:leading-11"
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder="Không có tiêu đề"
      readOnly={!editable}
      rows={1}
      wrap="soft"
      value={value}
    />
  );
}
