'use client';

import dynamic from 'next/dynamic';

import type { CollabPerson } from '@/features/notes/hooks/useAwareness';
import type { UseCollabDocResult } from '@/features/notes/hooks/useCollabDoc';
import type { PageDetail } from '@/features/notes/types';
import type { OutlineItem } from '@/lib/editor/heading-outline';

import { NoteEditorSkeleton } from './NoteEditorSkeleton';

const LazyTiptapEditor = dynamic(
  () => import('../../editor-next/NoteEditorNext').then((module) => module.NoteEditorNext),
  { loading: () => <NoteEditorSkeleton testId="note-editor-next-chunk-loading" />, ssr: false },
);

interface SelectedNoteEditorProps {
  collab: UseCollabDocResult;
  onOutlineChange: (items: OutlineItem[]) => void;
  page: Pick<PageDetail, 'id' | 'myRole' | 'parentId' | 'workspaceId'>;
  pageId: string;
  people: CollabPerson[];
}

export function SelectedNoteEditor({
  collab,
  onOutlineChange,
  page,
}: SelectedNoteEditorProps) {
  if (!collab.doc || !collab.provider || !collab.isLocalReady) {
    return <NoteEditorSkeleton testId="note-editor-next-loading" />;
  }
  return (
    <LazyTiptapEditor
      doc={collab.doc}
      onOutlineChange={onOutlineChange}
      page={page}
      provider={collab.provider}
    />
  );
}
