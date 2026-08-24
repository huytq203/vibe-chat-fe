/**
 * Tên fragment XML mà BlockNote 0.54.0 dùng cho nội dung tài liệu.
 *
 * KHÔNG phải 'document', cũng không phải 'document-store'. Spec mục 5.2 ban đầu ghi
 * 'document'; nếu FE ghi vào fragment đó thì server đọc fragment 'prosemirror' và
 * thấy TÀI LIỆU RỖNG mà không có lỗi nào — mất dữ liệu âm thầm.
 *
 * Xác nhận bằng spike 2026-08-23-blocknote-server-util.md. Mỗi lần nâng BlockNote
 * phải chạy lại probe đó rồi cập nhật hằng số này.
 */
export const COLLAB_FRAGMENT_NAME = 'prosemirror';

/** Tên tài liệu Hocuspocus. BE tách pageId bằng tiền tố này (`collab/ports.ts:38`). */
export function collabDocumentName(pageId: string): string {
  return `page:${pageId}`;
}
