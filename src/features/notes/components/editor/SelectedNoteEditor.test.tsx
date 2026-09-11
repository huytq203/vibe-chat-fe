import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  NOTE_EDITOR_KIND,
  SELECTED_NOTE_EDITOR,
} from '@/features/notes/constants';
import type { UseCollabDocResult } from '@/features/notes/hooks/useCollabDoc';
import type { CollabProvider, YDoc } from '@/lib/collab';

import { SelectedNoteEditor } from './SelectedNoteEditor';

vi.mock('./NoteEditor', () => ({
  NoteEditor: () => <div data-testid="blocknote-editor" />,
}));

vi.mock('../../editor-next/NoteEditorNext', () => ({
  NoteEditorNext: () => <div data-testid="tiptap-editor" />,
}));

const readyCollab: UseCollabDocResult = {
  doc: {} as YDoc,
  provider: {} as CollabProvider,
  status: 'connected',
  isLocalReady: true,
  isSynced: true,
  error: null,
};

function renderEditor(editorKind: (typeof NOTE_EDITOR_KIND)[keyof typeof NOTE_EDITOR_KIND]) {
  return render(
    <SelectedNoteEditor
      collab={readyCollab}
      editorKind={editorKind}
      onOutlineChange={vi.fn()}
      page={{ id: 'page-1', workspaceId: 'workspace-1', parentId: null, myRole: 'EDIT' }}
      pageId="page-1"
      people={[]}
    />,
  );
}

describe('công tắc trình soạn thảo ghi chú', () => {
  it('nên dùng Tiptap khi công tắc để mặc định', () => {
    expect(SELECTED_NOTE_EDITOR).toBe(NOTE_EDITOR_KIND.TIPTAP);
  });

  it('nên dựng editor Tiptap khi editorKind là tiptap', async () => {
    renderEditor(NOTE_EDITOR_KIND.TIPTAP);

    expect(await screen.findByTestId('tiptap-editor')).toBeInTheDocument();
    expect(screen.queryByTestId('blocknote-editor')).not.toBeInTheDocument();
  });

  it('nên dựng BlockNote khi editorKind là blocknote', async () => {
    renderEditor(NOTE_EDITOR_KIND.BLOCK_NOTE);

    expect(await screen.findByTestId('blocknote-editor')).toBeInTheDocument();
    expect(screen.queryByTestId('tiptap-editor')).not.toBeInTheDocument();
  });
});
