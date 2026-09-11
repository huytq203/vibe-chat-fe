/** Tên fragment XML dùng chung giữa Tiptap ở FE và dịch vụ tài liệu ở BE. */
export const COLLAB_FRAGMENT_NAME = 'prosemirror';

/** Tên tài liệu Hocuspocus. BE tách pageId bằng tiền tố này (`collab/ports.ts:38`). */
export function collabDocumentName(pageId: string): string {
  return `page:${pageId}`;
}
