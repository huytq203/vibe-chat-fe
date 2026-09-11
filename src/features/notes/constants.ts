export const NOTE_EDITOR_KIND = {
  BLOCK_NOTE: 'blocknote',
  TIPTAP: 'tiptap',
} as const;

export type NoteEditorKind = (typeof NOTE_EDITOR_KIND)[keyof typeof NOTE_EDITOR_KIND];

/** Tiptap là mặc định; dữ liệu BlockNote cũ chỉ là dữ liệu test và sẽ được xoá. */
export const SELECTED_NOTE_EDITOR: NoteEditorKind = NOTE_EDITOR_KIND.TIPTAP;
