import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { COLLAB_FRAGMENT_NAME, type CollabProvider, type YDoc } from '@/lib/collab';

import { NoteEditor } from './NoteEditor';

const mocks = vi.hoisted(() => ({
  blockNoteView: vi.fn(({ editable }: { editable: boolean }) => (
    <div data-editable={String(editable)} data-testid="blocknote-view" />
  )),
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

vi.mock('@/features/notes/hooks/useCollabDoc', () => ({
  useCollabDoc: mocks.useCollabDoc,
}));

vi.mock('@/features/notes/hooks/use-query', () => ({
  usePage: mocks.usePage,
}));

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
  setRole('EDIT');
  setCollabError();
  mocks.useCreateBlockNote.mockReturnValue(editor);
});

describe('trình soạn thảo ghi chú', () => {
  it("lấy fragment bằng hằng số có đúng giá trị 'prosemirror'", () => {
    render(<NoteEditor pageId="page-1" />);

    expect(COLLAB_FRAGMENT_NAME).toBe('prosemirror');
    expect(doc.getXmlFragment).toHaveBeenCalledWith(COLLAB_FRAGMENT_NAME);
    expect(mocks.useCreateBlockNote).toHaveBeenCalledWith(
      expect.objectContaining({
        collaboration: expect.objectContaining({ fragment, provider }),
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

  it('hiện nguyên văn lỗi kết nối cộng tác trong trang lỗi', () => {
    setCollabError('Máy chủ từ chối quyền truy cập trang');
    render(<NoteEditor pageId="page-1" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Máy chủ từ chối quyền truy cập trang');
    expect(screen.queryByTestId('blocknote-view')).not.toBeInTheDocument();
  });
});
