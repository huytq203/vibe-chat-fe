import { act, render } from '@testing-library/react';
import type { Editor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Doc as YDoc } from 'yjs';

import type { CollabProvider } from '@/lib/collab';

import { NoteEditorNext } from './NoteEditorNext';

let currentJson: JSONContent;
let editor: Editor;
let updateHandler: (() => void) | undefined;

vi.mock('@tiptap/react', () => ({
  EditorContent: () => <div data-testid="editor-content" />,
  useEditor: () => editor,
}));

vi.mock('@tiptap/extension-drag-handle-react', () => ({
  DragHandle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/features/notes/components/editor/NoteTitle', () => ({
  NoteTitle: () => <div data-testid="note-title" />,
}));

vi.mock('@/lib/collab', () => ({
  markLocalCollabCursorMoved: vi.fn(),
  startCollabCursorLabels: vi.fn(),
}));

vi.mock('./extensions', () => ({
  createCollaborativeNoteEditorExtensions: () => [],
}));

vi.mock('./slash-command', () => ({ SlashCommand: {} }));
vi.mock('./BubbleToolbar', () => ({ BubbleToolbar: () => null }));

const props = {
  doc: {} as YDoc,
  page: { id: 'page-1', workspaceId: 'workspace-1', parentId: null, myRole: 'EDIT' as const },
  provider: {} as CollabProvider,
};

beforeEach(() => {
  updateHandler = undefined;
  currentJson = { type: 'doc', content: [] };
  editor = {
    commands: { focus: vi.fn() },
    getJSON: vi.fn(() => currentJson),
    off: vi.fn(),
    on: vi.fn((event: string, handler: () => void) => {
      if (event === 'update') updateHandler = handler;
    }),
  } as unknown as Editor;
});

describe('NoteEditorNext', () => {
  it('nên phát mục lục khi tài liệu đổi', () => {
    const onOutlineChange = vi.fn();
    render(<NoteEditorNext {...props} onOutlineChange={onOutlineChange} />);

    expect(onOutlineChange).toHaveBeenLastCalledWith([]);
    currentJson = {
      type: 'doc',
      content: [{
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Mục mới' }],
      }],
    };
    act(() => updateHandler?.());

    expect(onOutlineChange).toHaveBeenLastCalledWith([
      { id: 'heading-0', level: 2, text: 'Mục mới' },
    ]);
  });

  it('nên phát mảng rỗng khi unmount', () => {
    const onOutlineChange = vi.fn();
    const view = render(<NoteEditorNext {...props} onOutlineChange={onOutlineChange} />);
    onOutlineChange.mockClear();

    view.unmount();

    expect(editor.off).toHaveBeenCalledWith('update', updateHandler);
    expect(onOutlineChange).toHaveBeenCalledWith([]);
  });
});
