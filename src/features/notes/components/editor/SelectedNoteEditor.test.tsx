import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { UseCollabDocResult } from '@/features/notes/hooks/useCollabDoc';
import type { CollabProvider, YDoc } from '@/lib/collab';

import { SelectedNoteEditor } from './SelectedNoteEditor';

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

function renderEditor(collab: UseCollabDocResult = readyCollab) {
  return render(
    <SelectedNoteEditor
      collab={collab}
      onOutlineChange={vi.fn()}
      page={{ id: 'page-1', workspaceId: 'workspace-1', parentId: null, myRole: 'EDIT' }}
      pageId="page-1"
      people={[]}
    />,
  );
}

describe('trình soạn thảo ghi chú', () => {
  it('nên dựng editor Tiptap khi tài liệu cộng tác đã sẵn sàng', async () => {
    renderEditor();

    expect(await screen.findByTestId('tiptap-editor')).toBeInTheDocument();
  });

  it('nên dựng skeleton khi tài liệu cộng tác chưa sẵn sàng', () => {
    renderEditor({ ...readyCollab, isLocalReady: false });

    expect(screen.queryByTestId('tiptap-editor')).not.toBeInTheDocument();
    expect(screen.getByTestId('note-editor-next-loading')).toBeInTheDocument();
  });
});
