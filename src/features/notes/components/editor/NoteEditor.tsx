'use client';

import { vi as vietnameseDictionary } from '@blocknote/core/locales';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import { useCallback, useMemo } from 'react';

import { ErrorState } from '@/components/common/ErrorState';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { useAuthStore } from '@/features/auth';
import { useCollabDoc } from '@/features/notes/hooks/useCollabDoc';
import { usePage } from '@/features/notes/hooks/use-query';
import { COLLAB_FRAGMENT_NAME, type CollabProvider, type YDoc } from '@/lib/collab';
import { useTheme } from '@/lib/theme/ThemeProvider';

import { NoteTitle } from './NoteTitle';

const EMPTY_PLACEHOLDER = "Nhấn `/` để chèn khối";
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
}

interface ConnectedEditorProps {
  doc: YDoc;
  editable: boolean;
  provider: CollabProvider;
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

function ConnectedEditor({ doc, editable, provider }: ConnectedEditorProps) {
  const authUser = useAuthStore((state) => state.user);
  const { currentTheme } = useTheme();
  const user = useMemo(() => ({
    color: 'var(--primary)',
    id: authUser?.id ?? 'anonymous',
    name: authUser?.displayName?.trim() || authUser?.username || 'Người dùng Halo',
  }), [authUser]);
  const dictionary = useMemo(() => ({
    ...vietnameseDictionary,
    placeholders: {
      ...vietnameseDictionary.placeholders,
      default: EMPTY_PLACEHOLDER,
      emptyDocument: EMPTY_PLACEHOLDER,
    },
  }), []);
  const editor = useCreateBlockNote({
    collaboration: {
      fragment: doc.getXmlFragment(COLLAB_FRAGMENT_NAME),
      provider,
      user,
    },
    dictionary,
  }, [dictionary, doc, provider, user]);
  const moveToBody = useCallback(() => {
    const firstBlock = editor.document[0] ?? editor.insertBlocks(
      [{ type: 'paragraph' }], editor.getTextCursorPosition().block, 'before',
    )[0];
    if (firstBlock) editor.setTextCursorPosition(firstBlock, 'start');
    editor.focus();
  }, [editor]);

  return (
    <>
      <NoteTitle doc={doc} editable={editable} onMoveToBody={moveToBody} />
      <BlockNoteView
        className={`mt-4 ${editorThemeClasses}`}
        editable={editable}
        editor={editor}
        theme={currentTheme.isDark ? 'dark' : 'light'}
      />
    </>
  );
}

export function NoteEditor({ pageId }: NoteEditorProps) {
  const pageQuery = usePage(pageId);
  const collab = useCollabDoc(pageId, { enabled: Boolean(pageQuery.data) });

  if (collab.error) return <ErrorState message={collab.error} />;
  if (pageQuery.isError) return <ErrorState message="Không tải được trang" />;
  if (pageQuery.isLoading || !pageQuery.data || !collab.doc
    || !collab.provider || !collab.isSynced) {
    return <NoteEditorSkeleton />;
  }

  const editable = pageQuery.data.myRole !== 'VIEW' && pageQuery.data.myRole !== 'COMMENT';
  return <ConnectedEditor doc={collab.doc} editable={editable} provider={collab.provider} />;
}
