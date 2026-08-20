import { describe, it, expect, vi, beforeAll } from 'vitest';
import { fireEvent } from '@testing-library/react';
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

  it('chọn ảnh qua nút "Chèn ảnh" sẽ upload và chèn vào nội dung, không double vào paste', async () => {
    const onPasteImage = vi.fn().mockResolvedValue({
      attachmentId: 'att-1',
      src: 'https://cdn.example.com/img.png',
      alt: 'img.png',
    });
    const { container, findByLabelText } = renderWithProviders(
      <TaskDescriptionEditor value="" onSave={vi.fn()} onPasteImage={onPasteImage} />,
    );

    await vi.waitFor(() => container.querySelector('.ProseMirror'));

    // Click vào editor để vào chế độ edit → toolbar (và nút "Chèn ảnh") mới hiện ra.
    const editorWrapper = container.querySelector('.relative.rounded-lg');
    fireEvent.click(editorWrapper as Element);

    const uploadBtn = await findByLabelText('Chèn ảnh');
    expect(uploadBtn).toBeInTheDocument();

    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    const file = new File(['x'], 'img.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await vi.waitFor(() => expect(onPasteImage).toHaveBeenCalledTimes(1));
    expect(onPasteImage).toHaveBeenCalledWith(file);

    const img = await vi.waitFor(() => {
      const el = container.querySelector('img[data-attachment-id="att-1"]');
      if (!el) throw new Error('image not inserted yet');
      return el;
    });
    expect(img.getAttribute('src')).toBe('https://cdn.example.com/img.png');
  });
});
