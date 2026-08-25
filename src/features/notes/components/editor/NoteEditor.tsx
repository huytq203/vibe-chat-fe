'use client';

import { vi as vietnameseDictionary } from '@blocknote/core/locales';
import type { BlocksChanged } from '@blocknote/core';
// `collaboration` không phải field của BlockNoteEditorOptions — tự đặt nó vào object
// options (như code cũ làm) là no-op âm thầm: TypeScript không báo lỗi (đối tượng chứ
// không phải literal ngay chỗ gọi), plugin ySync không bao giờ được cài, ProseMirror
// gõ được bình thường nhưng Y.Doc không bao giờ nhận update — mất nội dung hoàn toàn,
// không lỗi nào hiện ra. withCollaboration() (chỉ có ở subpath /yjs) mới thực sự thêm
// CollaborationExtension (ySync/yCursor/yUndo) vào extensions.
import { withCollaboration } from '@blocknote/core/yjs';
import { SideMenuController, useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
// Bắt buộc: định nghĩa toàn bộ layout/vị trí của BlockNote (cỡ chữ heading, slash
// menu, formatting toolbar, side menu kéo-thả…) — thiếu import này thì heading trông
// giống văn bản thường và các menu nổi định vị/hiển thị sai. editorThemeClasses bên
// dưới chỉ GHI ĐÈ màu lên nền CSS này, không thay thế được nó.
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
import { useNotesUiStore } from '@/features/notes/stores/notes-ui.store';
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

import { BlockSideMenu } from './BlockSideMenu';
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
  '[&_.bn-side-menu]:relative [&_.bn-side-menu]:-left-1 [&_.bn-side-menu]:!h-6',
  '[&_.bn-toggle-button]:!text-muted-foreground [&_.bn-toggle-button_svg]:!w-4 [&_.bn-toggle-button_svg]:!h-4',
  '[&_[data-content-type="heading"]]:![--level:1.75rem]',
  '[&_[data-content-type="heading"][data-level="2"]]:![--level:1.5rem]',
  '[&_[data-content-type="heading"][data-level="3"]]:![--level:1.25rem]',
  '[&_[data-content-type="heading"][data-level="4"]]:![--level:1.2rem]',
  '[&_[data-content-type="heading"][data-level="5"]]:![--level:1.15rem]',
  '[&_[data-content-type="heading"][data-level="6"]]:![--level:1.1rem]',
].join(' ');

interface NoteEditorProps {
  pageId: string;
  collab?: UseCollabDocResult;
  people?: CollabPerson[];
  commentedBlockIds?: string[];
}

interface ConnectedEditorProps {
  doc: YDoc;
  editable: boolean;
  page: Pick<Page, 'id' | 'workspaceId' | 'parentId'>;
  pageId: string;
  person: CollabPerson;
  provider: CollabProvider;
  commentedBlockIds: string[];
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

function removeCommentAnchor(outer: HTMLElement) {
  const block = outer.querySelector<HTMLElement>(':scope > [data-comment-highlight]');
  if (block) {
    block.classList.remove('bg-primary/5', 'transition-colors');
    delete block.dataset.commentHighlight;
  }
  const button = outer.querySelector<HTMLButtonElement>(':scope > [data-comment-anchor]');
  if (button) {
    button.remove();
    if (outer.dataset.commentPositioned) {
      outer.classList.remove('relative');
      delete outer.dataset.commentPositioned;
    }
  }
}

function clearCommentAnchors(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('[data-node-type="blockOuter"]').forEach(
    removeCommentAnchor,
  );
}

function addCommentAnchor(outer: HTMLElement, blockId: string, onOpen: (id: string) => void) {
  if (outer.querySelector(':scope > [data-comment-anchor]')) return;
  if (!outer.classList.contains('relative')) {
    outer.classList.add('relative');
    outer.dataset.commentPositioned = 'true';
  }
  const button = document.createElement('button');
  const dot = document.createElement('span');
  button.type = 'button';
  button.dataset.commentAnchor = blockId;
  button.ariaLabel = 'Mở bình luận của khối';
  button.title = 'Mở bình luận của khối';
  button.className = 'absolute -end-6 top-1/2 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  dot.className = 'size-1.5 rounded-full bg-primary';
  dot.ariaHidden = 'true';
  button.append(dot);
  button.addEventListener('click', () => onOpen(blockId));
  outer.append(button);
}

function syncCommentAnchors(root: HTMLElement, ids: Set<string>, onOpen: (id: string) => void) {
  root.querySelectorAll<HTMLElement>('[data-node-type="blockOuter"][data-id]').forEach(
    (outer) => {
      const blockId = outer.dataset.id;
      if (!blockId || !ids.has(blockId)) { removeCommentAnchor(outer); return; }
      const block = outer.querySelector<HTMLElement>(':scope > [data-node-type="blockContainer"]');
      if (!block) return;
      block.dataset.commentHighlight = 'true';
      block.classList.add('bg-primary/5', 'transition-colors');
      addCommentAnchor(outer, blockId, onOpen);
    },
  );
}

function useCommentAnchors(commentedBlockIds: string[]) {
  const rootRef = useRef<HTMLDivElement>(null);
  const openThread = useNotesUiStore((state) => state.openCommentThread);
  const ids = useMemo(() => new Set(commentedBlockIds), [commentedBlockIds]);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const sync = () => syncCommentAnchors(root, ids, openThread);
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { childList: true, subtree: true });
    return () => { observer.disconnect(); clearCommentAnchors(root); };
  }, [ids, openThread]);
  return rootRef;
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

function ConnectedEditor({ commentedBlockIds, doc, editable, page, pageId, person, provider }: ConnectedEditorProps) {
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
    dictionary: vietnameseEditorDictionary,
    resolveFileUrl: resolveAttachmentFileUrl,
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
  const anchorRootRef = useCommentAnchors(commentedBlockIds);

  return (
    <>
      <NoteTitle doc={doc} editable={editable} onMoveToBody={moveToBody} page={page} />
      <div ref={anchorRootRef}>
        <BlockNoteView
          className={`mt-4 ${editorThemeClasses}`}
          editable={editable}
          editor={editor}
          sideMenu={false}
          theme={currentTheme.isDark ? 'dark' : 'light'}
          onKeyUp={handleCursorKey}
          onPointerUp={markCursorMoved}
        >
          <SideMenuController sideMenu={BlockSideMenu} />
        </BlockNoteView>
      </div>
    </>
  );
}

export function NoteEditor({ pageId, collab: sharedCollab, people,
  commentedBlockIds = [],
}: NoteEditorProps) {
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
      commentedBlockIds={commentedBlockIds}
      doc={collab.doc}
      editable={editable}
      page={pageQuery.data}
      pageId={pageId}
      person={self}
      provider={collab.provider}
    />
  );
}
