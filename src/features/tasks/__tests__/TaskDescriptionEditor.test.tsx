import { describe, it, expect, vi, beforeAll } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { TaskDescriptionEditor } from '../components/board/TaskDescriptionEditor';

describe('TaskDescriptionEditor', () => {
  // jsdom thiếu elementFromPoint — Placeholder (Tiptap v3) gọi posAtCoords khi mount.
  beforeAll(() => {
    if (!document.elementFromPoint) {
      document.elementFromPoint = () => null;
    }
  });

  it('mount view Tiptap + hiện placeholder ngay cả khi mô tả rỗng', async () => {
    const { container, findByText } = renderWithProviders(
      <TaskDescriptionEditor value="" onSave={vi.fn()} placeholder="Thêm mô tả…" />,
    );
    // View Tiptap phải gắn DOM (bug cũ: rỗng thì không mount EditorContent).
    const view = await vi.waitFor(() => container.querySelector('.ProseMirror'));
    expect(view).not.toBeNull();
    // Mặc định readonly → hiển thị như đoạn văn (chưa sửa được).
    expect(view?.getAttribute('contenteditable')).toBe('false');
    expect(await findByText('Thêm mô tả…')).toBeInTheDocument();
  });

  it('hiển thị nội dung HTML có sẵn', async () => {
    const { findByText } = renderWithProviders(
      <TaskDescriptionEditor value="<p>Nội dung mẫu</p>" onSave={vi.fn()} />,
    );
    expect(await findByText('Nội dung mẫu')).toBeInTheDocument();
  });
});
