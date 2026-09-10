'use client';

import {
  BlockNoteSchema,
  createCodeBlockSpec,
  defaultBlockSpecs,
  SyntaxHighlightingExtension,
  type BlocksChanged,
} from '@blocknote/core';
import { vi as vietnameseDictionary } from '@blocknote/core/locales';
// `collaboration` không phải field của BlockNoteEditorOptions — tự đặt nó vào object
// options (như code cũ làm) là no-op âm thầm: TypeScript không báo lỗi (đối tượng chứ
// không phải literal ngay chỗ gọi), plugin ySync không bao giờ được cài, ProseMirror
// gõ được bình thường nhưng Y.Doc không bao giờ nhận update — mất nội dung hoàn toàn,
// không lỗi nào hiện ra. withCollaboration() (chỉ có ở subpath /yjs) mới thực sự thêm
// CollaborationExtension (ySync/yCursor/yUndo) vào extensions.
import { withCollaboration } from '@blocknote/core/yjs';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { AllSelection, type Transaction } from '@tiptap/pm/state';
// CSS của BlockNote phải import từ đây (TS), KHÔNG phải từ `src/styles/index.css`:
// `@blocknote/mantine/style.css` chỉ là vỏ chứa hai `@import url(...)` lồng nhau, mà bộ
// phân giải CSS của Tailwind không đi theo dạng url() — nhét vào index.css thì hai dòng
// đó bị để nguyên văn và Turbopack đi tìm `./mantineStyles.css` cạnh index.css (không có).
// Import từ TS thì Turbopack phân giải tương đối với package, đúng như tài liệu BlockNote.
import '@blocknote/mantine/style.css';
import {
  useCallback,
  useEffect,
  useMemo,
  type KeyboardEvent,
} from 'react';
import { toast } from 'sonner';
import type { Awareness } from 'y-protocols/awareness';

import { ErrorState } from '@/components/common/ErrorState';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import {
  type CollabPerson,
  useAwareness,
} from '@/features/notes/hooks/useAwareness';
import { useCollabDoc } from '@/features/notes/hooks/useCollabDoc';
import type { UseCollabDocResult } from '@/features/notes/hooks/useCollabDoc';
import { usePage } from '@/features/notes/hooks/use-query';
import { useFileUpload } from '@/features/notes/hooks/useFileUpload';
import { resolveAttachmentFileUrl } from '@/features/notes/lib/resolve-file-url';
import type { Page } from '@/features/notes/types';
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
import { createCodeCopyButton } from '@/features/notes/lib/code-copy-button';
import {
  CODE_BLOCK_LANGUAGES,
  getCodeHighlighter,
  resolveCodeLanguage,
} from '@/features/notes/lib/code-highlighting';

export function createNoteCodeBlockSpec() {
  const baseSpec = createCodeBlockSpec({
    defaultLanguage: 'text',
    supportedLanguages: CODE_BLOCK_LANGUAGES,
  });
  return {
    ...baseSpec,
    implementation: {
      ...baseSpec.implementation,
      render: (...args: Parameters<typeof baseSpec.implementation.render>) => {
        const language = resolveCodeLanguage(args[0].props.language);
        const block = { ...args[0], props: { ...args[0].props, language } };
        const rendered = baseSpec.implementation.render.call({}, block, args[1]);
        if (!rendered.contentDOM) return rendered;
        const editor = args[1];
        const { contentDOM } = rendered;
        const ownerDocument = contentDOM.ownerDocument;
        const languageSelect = rendered.dom.querySelector('select');
        const restoreEditorFocus = () => queueMicrotask(() => editor.focus());
        languageSelect?.addEventListener('change', restoreEditorFocus);
        const copyControl = createCodeCopyButton(
          ownerDocument,
          () => contentDOM.textContent ?? '',
          'note-code-copy',
        );
        rendered.dom.appendChild(copyControl.button);

        return {
          ...rendered,
          destroy: () => {
            languageSelect?.removeEventListener('change', restoreEditorFocus);
            copyControl.destroy();
            rendered.destroy?.();
          },
        };
      },
    },
  };
}

const noteEditorSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    codeBlock: createNoteCodeBlockSpec(),
  },
});

const syntaxHighlighting = SyntaxHighlightingExtension({
  createHighlighter: getCodeHighlighter,
});

const DOCUMENT_WARNING_BYTES = 3 * 1024 * 1024;
const DOCUMENT_LIMIT_BYTES = 5 * 1024 * 1024;
const DOCUMENT_MEASURE_INTERVAL_MS = 3_000;
const CURSOR_MOVEMENT_KEYS = new Set([
  'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp',
  'End', 'Home', 'PageDown', 'PageUp',
]);

interface NoteEditorProps {
  pageId: string;
  collab?: UseCollabDocResult;
  people?: CollabPerson[];
}

interface ConnectedEditorProps {
  doc: YDoc;
  editable: boolean;
  page: Pick<Page, 'id' | 'workspaceId' | 'parentId'>;
  pageId: string;
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

function selectAllEditorContent(editor: NoteBlockEditor): void {
  editor.transact((transaction: Transaction) => {
    transaction.setSelection(new AllSelection(transaction.doc));
  });
  editor.focus();
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

function ConnectedEditor({ doc, editable, page, pageId, person, provider }: ConnectedEditorProps) {
  const { currentTheme } = useTheme();
  const uploadFile = useFileUpload(pageId);
  const user = useMemo(() => ({
    color: person.color,
    id: person.userId,
    name: person.name,
  }), [person]);
  const editor = useCreateBlockNote(withCollaboration({
    collaboration: {
      fragment: doc.getXmlFragment(COLLAB_FRAGMENT_NAME),
      // HocuspocusProvider.awareness kiểu Awareness | null (thư viện), BlockNote đòi
      // Awareness | undefined — provider luôn có awareness khi tới đây, ép kiểu an toàn.
      provider: provider as unknown as { awareness?: Awareness },
      renderCursor: createCollabCursorElement,
      showCursorLabels: 'always',
      user,
    },
    dictionary: vietnameseDictionary,
    extensions: [syntaxHighlighting],
    resolveFileUrl: resolveAttachmentFileUrl,
    schema: noteEditorSchema,
    uploadFile,
  }), [doc, provider, user, uploadFile]);
  const moveToBody = useCallback(() => {
    const firstBlock = editor.document[0] ?? editor.insertBlocks(
      [{ type: 'paragraph' }], editor.getTextCursorPosition().block, 'before',
    )[0];
    if (firstBlock) editor.setTextCursorPosition(firstBlock, 'start');
    editor.focus();
  }, [editor]);
  useDocumentLimit(doc, editor);
  const { handleCursorKey, markCursorMoved } = useCursorActivity(provider);
  const handleSelectAll = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (
      event.altKey
      || (!event.ctrlKey && !event.metaKey)
      || event.key.toLowerCase() !== 'a'
      || event.nativeEvent.isComposing
    ) return;

    event.preventDefault();
    selectAllEditorContent(editor);
  }, [editor]);

  return (
    <>
      <NoteTitle doc={doc} editable={editable} onMoveToBody={moveToBody} page={page} />
      <div onKeyDownCapture={handleSelectAll}>
        <BlockNoteView
          className="notes-editor mt-3"
          editable={editable}
          editor={editor}
          theme={currentTheme.isDark ? 'dark' : 'light'}
          onKeyUp={handleCursorKey}
          onPointerUp={markCursorMoved}
        />
      </div>
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
  // Cho phép soạn thảo khi mới có bản cục bộ — mất mạng vẫn gõ được. Bù lại
  // ConnectionIndicator BẮT BUỘC hiện "Chưa lưu lên máy chủ", nếu không người
  // dùng sẽ tưởng đã lưu trong khi nội dung chỉ nằm trong IndexedDB máy này.
  if (collab.error && (!collab.doc || !collab.provider || !collab.isLocalReady)) {
    return <ErrorState message={collab.error} />;
  }
  if (pageQuery.isLoading || !pageQuery.data || !collab.doc
    || !collab.provider || !collab.isLocalReady || !self) {
    return <NoteEditorSkeleton />;
  }

  const editable = pageQuery.data.myRole !== 'VIEW' && pageQuery.data.myRole !== 'COMMENT';
  return (
    <ConnectedEditor
      doc={collab.doc}
      editable={editable}
      page={pageQuery.data}
      pageId={pageId}
      person={self}
      provider={collab.provider}
    />
  );
}
