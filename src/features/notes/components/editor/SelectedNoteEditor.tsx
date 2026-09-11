'use client';

import dynamic from 'next/dynamic';

import {
  NOTE_EDITOR_KIND,
  type NoteEditorKind,
} from '@/features/notes/constants';
import type { CollabPerson } from '@/features/notes/hooks/useAwareness';
import type { UseCollabDocResult } from '@/features/notes/hooks/useCollabDoc';
import type { PageDetail } from '@/features/notes/types';
import type { OutlineItem } from '@/lib/editor/heading-outline';

import { NoteEditorSkeleton } from './NoteEditorSkeleton';

const LazyBlockNoteEditor = dynamic(
  () => import('./NoteEditor').then((module) => module.NoteEditor),
  { loading: () => <NoteEditorSkeleton testId="note-editor-chunk-loading" />, ssr: false },
);

const LazyTiptapEditor = dynamic(
  () => import('../../editor-next/NoteEditorNext').then((module) => module.NoteEditorNext),
  { loading: () => <NoteEditorSkeleton testId="note-editor-next-chunk-loading" />, ssr: false },
);

interface SelectedNoteEditorProps {
  collab: UseCollabDocResult;
  editorKind: NoteEditorKind;
  onOutlineChange: (items: OutlineItem[]) => void;
  page: Pick<PageDetail, 'id' | 'myRole' | 'parentId' | 'workspaceId'>;
  pageId: string;
  people: CollabPerson[];
}

export function SelectedNoteEditor({
  collab,
  editorKind,
  onOutlineChange,
  page,
  pageId,
  people,
}: SelectedNoteEditorProps) {
  if (editorKind === NOTE_EDITOR_KIND.TIPTAP) {
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

  return (
    <LazyBlockNoteEditor
      pageId={pageId}
      collab={collab}
      onOutlineChange={onOutlineChange}
      people={people}
    />
  );
}
