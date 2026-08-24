'use client';

import { vi as vietnameseDictionary } from '@blocknote/core/locales';
import type { BlocksChanged } from '@blocknote/core';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import {
  useCallback,
  useEffect,
  useMemo,
  type KeyboardEvent,
} from 'react';
import { toast } from 'sonner';

import { ErrorState } from '@/components/common/ErrorState';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import {
  type CollabPerson,
  useAwareness,
} from '@/features/notes/hooks/useAwareness';
import { useCollabDoc } from '@/features/notes/hooks/useCollabDoc';
import type { UseCollabDocResult } from '@/features/notes/hooks/useCollabDoc';
import { usePage } from '@/features/notes/hooks/use-query';
import {
  COLLAB_FRAGMENT_NAME,
  collabDocumentStateVectorBytes,
  createCollabCursorElement,
  markLocalCollabCursorMoved,
  startCollabCursorLabels,
  type CollabProvider,
  type YDoc,
} from '@/lib/collab';
import { useTheme } from '@/lib/theme/ThemeProvider';

import { NoteTitle } from './NoteTitle';

const EMPTY_PLACEHOLDER = "Nhấn `/` để chèn khối";
const DOCUMENT_WARNING_BYTES = 3 * 1024 * 1024;
const DOCUMENT_LIMIT_BYTES = 5 * 1024 * 1024;
const DOCUMENT_MEASURE_INTERVAL_MS = 3_000;
const CURSOR_MOVEMENT_KEYS = new Set([
  'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp',
  'End', 'Home', 'PageDown', 'PageUp',
]);
const vietnameseEditorDictionary = {
  ...vietnameseDictionary,
  placeholders: {
    ...vietnameseDictionary.placeholders,
    default: EMPTY_PLACEHOLDER,
    emptyDocument: EMPTY_PLACEHOLDER,
  },
};
const editorThemeClasses = [
  '[&.bn-root.bn-root]:[--bn-colors-editor-background:var(--background)]',
  '[&.bn-root.bn-root]:[--bn-colors-editor-text:var(--foreground)]',
  '[&.bn-root.bn-root]:[--bn-colors-menu-background:var(--background)]',
  '[&.bn-root.bn-root]:[--bn-colors-menu-text:var(--foreground)]',
  '[&.bn-root.bn-root]:[--bn-colors-tooltip-background:var(--accent)]',
  '[&.bn-root.bn-root]:[--bn-colors-tooltip-text:var(--foreground)]',
  '[&.bn-root.bn-root]:[--bn-colors-hovered-background:var(--accent)]',
  '[&.bn-root.bn-root]:[--bn-colors-hovered-text:var(--foreground)]',
  '[&.bn-root.bn-root]:[--bn-colors-selected-background:var(--primary)]',
  '[&.bn-root.bn-root]:[--bn-colors-selected-text:var(--foreground)]',
  '[&.bn-root.bn-root]:[--bn-colors-disabled-background:var(--accent)]',
  '[&.bn-root.bn-root]:[--bn-colors-disabled-text:var(--muted-foreground)]',
  '[&.bn-root.bn-root]:[--bn-colors-border:var(--border)]',
  '[&.bn-root.bn-root]:[--bn-colors-shadow:var(--border)]',
  '[&.bn-root.bn-root]:[--bn-colors-side-menu:var(--muted-foreground)]',
  '[&.bn-root.bn-root]:[--bn-font-family:var(--font-sans)]',
  '[&_.bn-editor]:rounded-none [&_.bn-editor]:bg-transparent',
  '[&_.bn-editor]:px-0 [&_.bn-editor]:py-0 [&_.bn-editor]:font-sans',
  '[&_.bn-editor]:text-base [&_.bn-editor]:leading-6',
  '[&_.bn-block-content]:min-h-10 [&_.bn-block-content]:py-2',
  '[&_.bn-side-menu]:relative [&_.bn-side-menu]:-left-1 [&_.bn-side-menu]:top-2',
].join(' ');

interface NoteEditorProps {
  pageId: string;
  collab?: UseCollabDocResult;
  people?: CollabPerson[];
}

interface ConnectedEditorProps {
  doc: YDoc;
  editable: boolean;
  person: CollabPerson;
  provider: CollabProvider;
}

type NoteBlockEditor = ReturnType<typeof useCreateBlockNote>;

function useDocumentLimit(doc: YDoc, editor: NoteBlockEditor): void {
  useEffect(() => {
    let currentBytes = 0;
    let warned = false;
    let lastBlockedToastAt = 0;
    const measure = () => {
      currentBytes = collabDocumentStateVectorBytes(doc);
      if (currentBytes > DOCUMENT_WARNING_BYTES && !warned) {
        warned = true;
        toast.warning('Tài liệu đã vượt 3 MB. Hãy rút gọn để tránh giới hạn 5 MB.');
      }
    };
    const unsubscribe = editor.onBeforeChange(({
      getChanges,
    }: { getChanges: () => BlocksChanged }) => {
      if (currentBytes <= DOCUMENT_LIMIT_BYTES) return;
      const insertsBlock = getChanges().some(
        (change) => change.type === 'insert' && change.source.type !== 'yjs-remote',
      );
      if (!insertsBlock) return;
      if (Date.now() - lastBlockedToastAt > 2_000) {
        lastBlockedToastAt = Date.now();
        toast.error('Không thể chèn khối mới vì tài liệu đã vượt giới hạn 5 MB.');
      }
      return false;
    });
    measure();
    const interval = window.setInterval(measure, DOCUMENT_MEASURE_INTERVAL_MS);
    return () => {
      window.clearInterval(interval);
      unsubscribe();
    };
  }, [doc, editor]);
}

function useCursorActivity(provider: CollabProvider) {
  useEffect(() => startCollabCursorLabels(provider), [provider]);
  const markCursorMoved = useCallback(() => {
    markLocalCollabCursorMoved(provider);
  }, [provider]);
  const handleCursorKey = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (CURSOR_MOVEMENT_KEYS.has(event.key)) markLocalCollabCursorMoved(provider);
  }, [provider]);
  return { handleCursorKey, markCursorMoved };
}

export function NoteEditorSkeleton() {
  return (
    <div className="space-y-4" data-testid="note-editor-loading">
      <Skeleton rounded="sm" className="h-9 w-full" />
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} rounded="sm" className="h-6 w-full" />
      ))}
    </div>
  );
}

function ConnectedEditor({ doc, editable, person, provider }: ConnectedEditorProps) {
  const { currentTheme } = useTheme();
  const user = useMemo(() => ({
    color: person.color,
    id: person.userId,
    name: person.name,
  }), [person]);
  const editor = useCreateBlockNote({
    collaboration: {
      fragment: doc.getXmlFragment(COLLAB_FRAGMENT_NAME),
      provider,
      renderCursor: createCollabCursorElement,
      showCursorLabels: 'always',
      user,
    },
    dictionary: vietnameseEditorDictionary,
  }, [doc, provider, user]);
  const moveToBody = useCallback(() => {
    const firstBlock = editor.document[0] ?? editor.insertBlocks(
      [{ type: 'paragraph' }], editor.getTextCursorPosition().block, 'before',
    )[0];
    if (firstBlock) editor.setTextCursorPosition(firstBlock, 'start');
    editor.focus();
  }, [editor]);
  useDocumentLimit(doc, editor);
  const { handleCursorKey, markCursorMoved } = useCursorActivity(provider);

  return (
    <>
      <NoteTitle doc={doc} editable={editable} onMoveToBody={moveToBody} />
      <BlockNoteView
        className={`mt-4 ${editorThemeClasses}`}
        editable={editable}
        editor={editor}
        theme={currentTheme.isDark ? 'dark' : 'light'}
        onKeyUp={handleCursorKey}
        onPointerUp={markCursorMoved}
      />
    </>
  );
}

export function NoteEditor({ pageId, collab: sharedCollab, people }: NoteEditorProps) {
  const pageQuery = usePage(pageId);
  const localCollab = useCollabDoc(pageId, {
    enabled: !sharedCollab && Boolean(pageQuery.data),
  });
  const collab = sharedCollab ?? localCollab;
  const localPeople = useAwareness(people ? null : collab.provider);
  const activePeople = people ?? localPeople;
  const self = activePeople.find((person) => person.isSelf) ?? activePeople[0];

  if (pageQuery.isError) return <ErrorState message="Không tải được trang" />;
  if (collab.error && (!collab.doc || !collab.provider || !collab.isSynced)) {
    return <ErrorState message={collab.error} />;
  }
  if (pageQuery.isLoading || !pageQuery.data || !collab.doc
    || !collab.provider || !collab.isSynced || !self) {
    return <NoteEditorSkeleton />;
  }

  const editable = pageQuery.data.myRole !== 'VIEW' && pageQuery.data.myRole !== 'COMMENT';
  return (
    <ConnectedEditor
      doc={collab.doc}
      editable={editable}
      person={self}
      provider={collab.provider}
    />
  );
}
