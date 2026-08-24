import type { BlocksChanged } from '@blocknote/core';
import type { KeyboardEventHandler, PointerEventHandler } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COLLAB_FRAGMENT_NAME, type CollabProvider, type YDoc } from '@/lib/collab';
import { cursorColorFor } from '@/features/notes/lib/cursor-colors';
import { useNotesUiStore } from '@/features/notes/stores/notes-ui.store';

import { NoteEditor } from './NoteEditor';

type BeforeChangeCallback = (
  context: { getChanges: () => BlocksChanged },
) => boolean | void;

const mocks = vi.hoisted(() => ({
  blockNoteView: vi.fn(({
    editable,
    onKeyUp,
    onPointerUp,
  }: {
    editable: boolean;
    onKeyUp?: KeyboardEventHandler<HTMLDivElement>;
    onPointerUp?: PointerEventHandler<HTMLDivElement>;
  }) => (
    <div
      data-editable={String(editable)}
      data-testid="blocknote-view"
      onKeyUp={onKeyUp}
      onPointerUp={onPointerUp}
    >
      <div data-node-type="blockOuter" data-id="block-1">
        <div data-node-type="blockContainer">Khối một</div>
      </div>
      <div data-node-type="blockOuter" data-id="block-2">
        <div data-node-type="blockContainer">Khối hai</div>
      </div>
    </div>
  )),
  beforeChange: null as BeforeChangeCallback | null,
  documentBytes: vi.fn(() => 0),
  markCursorMoved: vi.fn(),
  readAwareness: vi.fn(() => []),
  setLocalUser: vi.fn(),
  startCursorLabels: vi.fn(() => vi.fn()),
  subscribeAwareness: vi.fn(() => vi.fn()),
  toastError: vi.fn(),
  toastWarning: vi.fn(),
  useCollabDoc: vi.fn(),
  useCreateBlockNote: vi.fn(),
  usePage: vi.fn(),
}));

vi.mock('@blocknote/react', () => ({
  useCreateBlockNote: mocks.useCreateBlockNote,
}));

vi.mock('@blocknote/shadcn', () => ({
  BlockNoteView: mocks.blockNoteView,
}));

vi.mock('sonner', () => ({
  toast: { error: mocks.toastError, warning: mocks.toastWarning },
}));

vi.mock('@/features/notes/hooks/useCollabDoc', () => ({
  useCollabDoc: mocks.useCollabDoc,
}));

vi.mock('@/features/notes/hooks/use-query', () => ({
  usePage: mocks.usePage,
}));

vi.mock('@/lib/collab', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/collab')>();
  return {
    ...actual,
    collabDocumentStateVectorBytes: mocks.documentBytes,
    markLocalCollabCursorMoved: mocks.markCursorMoved,
    readCollabAwareness: mocks.readAwareness,
    setLocalCollabUser: mocks.setLocalUser,
    startCollabCursorLabels: mocks.startCursorLabels,
    subscribeCollabAwareness: mocks.subscribeAwareness,
  };
});

vi.mock('@/features/auth', () => ({
  useAuthStore: (select: (state: {
    user: { id: string; displayName: string; username: string };
  }) => unknown) => select({
    user: { id: 'user-1', displayName: 'Người viết', username: 'nguoi-viet' },
  }),
}));

vi.mock('@/lib/theme/ThemeProvider', () => ({
  useTheme: () => ({ currentTheme: { isDark: false } }),
}));

vi.mock('./NoteTitle', () => ({
  NoteTitle: () => <div data-testid="note-title" />,
}));

const fragment = { name: 'fragment-kiểm-thử' };
const doc = {
  getXmlFragment: vi.fn(() => fragment),
} as unknown as YDoc;
const provider = { awareness: {} } as unknown as CollabProvider;
const editor = {
  document: [{ id: 'block-1' }],
  focus: vi.fn(),
  getTextCursorPosition: vi.fn(),
  insertBlocks: vi.fn(),
  onBeforeChange: vi.fn((callback: BeforeChangeCallback) => {
    mocks.beforeChange = callback;
    return vi.fn();
  }),
  setTextCursorPosition: vi.fn(),
};

function setRole(myRole: 'VIEW' | 'EDIT') {
  mocks.usePage.mockReturnValue({
    data: { myRole },
    isError: false,
    isLoading: false,
  });
}

function setCollabError(error: string | null = null) {
  mocks.useCollabDoc.mockReturnValue({
    doc,
    error,
    isSynced: true,
    provider,
    status: 'connected',
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.beforeChange = null;
  mocks.documentBytes.mockReturnValue(0);
  setRole('EDIT');
  setCollabError();
  mocks.useCreateBlockNote.mockReturnValue(editor);
});

afterEach(() => {
  vi.useRealTimers();
  useNotesUiStore.setState({
    activeCommentBlockId: null,
    isSidePanelOpen: false,
    sidePanelTab: 'comments',
  });
});

describe('trình soạn thảo ghi chú', () => {
  it("lấy fragment bằng hằng số có đúng giá trị 'prosemirror'", () => {
    render(<NoteEditor pageId="page-1" />);

    expect(COLLAB_FRAGMENT_NAME).toBe('prosemirror');
    expect(doc.getXmlFragment).toHaveBeenCalledWith(COLLAB_FRAGMENT_NAME);
    expect(mocks.useCreateBlockNote).toHaveBeenCalledWith(
      expect.objectContaining({
        collaboration: expect.objectContaining({
          fragment,
          provider,
          user: {
            color: cursorColorFor('user-1'),
            id: 'user-1',
            name: 'Người viết',
          },
        }),
      }),
      expect.any(Array),
    );
  });

  it('cấu hình placeholder tiếng Việt cho tài liệu rỗng', () => {
    render(<NoteEditor pageId="page-1" />);

    expect(mocks.useCreateBlockNote).toHaveBeenCalledWith(
      expect.objectContaining({
        dictionary: expect.objectContaining({
          placeholders: expect.objectContaining({
            default: "Nhấn `/` để chèn khối",
            emptyDocument: "Nhấn `/` để chèn khối",
          }),
        }),
      }),
      expect.any(Array),
    );
  });

  it('khóa chỉnh sửa khi vai trò là VIEW', () => {
    setRole('VIEW');
    render(<NoteEditor pageId="page-1" />);

    expect(screen.getByTestId('blocknote-view')).toHaveAttribute('data-editable', 'false');
  });

  it('cho phép chỉnh sửa khi vai trò là EDIT', () => {
    render(<NoteEditor pageId="page-1" />);

    expect(screen.getByTestId('blocknote-view')).toHaveAttribute('data-editable', 'true');
  });

  it('giữ editor cục bộ dùng được khi máy chủ từ chối sau lúc nạp doc', () => {
    setCollabError('Máy chủ từ chối quyền truy cập trang');
    render(<NoteEditor pageId="page-1" />);

    expect(screen.getByTestId('blocknote-view')).toBeInTheDocument();
  });

  it('chỉ cảnh báo một lần khi state vector vượt 3 MB', () => {
    vi.useFakeTimers();
    mocks.documentBytes.mockReturnValue(3 * 1024 * 1024 + 1);
    render(<NoteEditor pageId="page-1" />);

    expect(mocks.toastWarning).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(9_000));
    expect(mocks.toastWarning).toHaveBeenCalledTimes(1);
  });

  it('chặn chèn khối cục bộ khi state vector vượt 5 MB', () => {
    mocks.documentBytes.mockReturnValue(5 * 1024 * 1024 + 1);
    render(<NoteEditor pageId="page-1" />);
    const localInsert = [{
      type: 'insert',
      source: { type: 'local' },
    }] as unknown as BlocksChanged;

    const accepted = mocks.beforeChange?.({ getChanges: () => localInsert });

    expect(accepted).toBe(false);
    expect(mocks.toastError).toHaveBeenCalledWith(
      'Không thể chèn khối mới vì tài liệu đã vượt giới hạn 5 MB.',
    );
  });

  it('vẫn nhận khối từ người cộng tác khi vượt 5 MB', () => {
    mocks.documentBytes.mockReturnValue(5 * 1024 * 1024 + 1);
    render(<NoteEditor pageId="page-1" />);
    const remoteInsert = [{
      type: 'insert',
      source: { type: 'yjs-remote' },
    }] as unknown as BlocksChanged;

    const accepted = mocks.beforeChange?.({ getChanges: () => remoteInsert });

    expect(accepted).toBeUndefined();
  });

  it('chỉ báo nhãn khi rê chuột hoặc dùng phím điều hướng, không báo khi gõ chữ', () => {
    render(<NoteEditor pageId="page-1" />);
    const view = screen.getByTestId('blocknote-view');

    fireEvent.keyUp(view, { key: 'a' });
    expect(mocks.markCursorMoved).not.toHaveBeenCalled();
    fireEvent.keyUp(view, { key: 'ArrowLeft' });
    fireEvent.pointerUp(view);
    expect(mocks.markCursorMoved).toHaveBeenCalledTimes(2);
  });

  it('tô khối có bình luận và mở đúng luồng khi bấm chấm ở máng phải', () => {
    render(<NoteEditor pageId="page-1" commentedBlockIds={['block-1']} />);

    const anchor = screen.getByRole('button', { name: 'Mở bình luận của khối' });
    const highlighted = screen.getByText('Khối một');
    expect(highlighted).toHaveClass('bg-primary/5');
    expect(screen.getByText('Khối hai')).not.toHaveClass('bg-primary/5');

    fireEvent.click(anchor);

    expect(useNotesUiStore.getState()).toMatchObject({
      activeCommentBlockId: 'block-1',
      isSidePanelOpen: true,
      sidePanelTab: 'comments',
    });
  });
});
