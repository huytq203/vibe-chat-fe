'use client';

import {
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';

import { type TitlePage, useYTitleValue } from '@/features/notes/hooks/use-title';
import type { YDoc } from '@/lib/collab';

interface NoteTitleProps {
  doc: YDoc;
  editable: boolean;
  onMoveToBody: () => void;
  page: TitlePage;
}

type YTitle = ReturnType<YDoc['getText']>;

function replaceTitle(title: YTitle, value: string): void {
  title.doc?.transact(() => {
    title.delete(0, title.length);
    if (value) title.insert(0, value);
  });
}

export function NoteTitle({ doc, editable, onMoveToBody, page }: NoteTitleProps) {
  const title = doc.getText('title');
  const value = useYTitleValue(title, page);
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (editable) replaceTitle(title, event.currentTarget.value);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' && event.key !== 'Tab') return;
    event.preventDefault();
    onMoveToBody();
  };

  return (
    <input
      aria-label="Tiêu đề trang"
      className="block w-full border-0 bg-transparent p-0 font-display text-[56px] font-bold leading-[64px] tracking-[-0.5px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-0"
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder="Không có tiêu đề"
      readOnly={!editable}
      value={value}
    />
  );
}
