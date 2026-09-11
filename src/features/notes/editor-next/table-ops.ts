"use client";

import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { isInTable, moveTableColumn, moveTableRow, selectedRect } from "@tiptap/pm/tables";

/**
 * Các thao tác bảng chưa được command có sẵn của `@tiptap/extension-table` hỗ trợ.
 *
 * `moveTableRow` / `moveTableColumn` có trong prosemirror-tables (được export lại
 * bởi `@tiptap/pm/tables`), nên thao tác di chuyển dựa trên thư viện. Upstream
 * không có command nhân bản, vì vậy phần này có chốt bảo vệ chủ động: không làm gì
 * với hàng/cột chạm vào ô gộp (row/col span), vốn có thể tạo bảng chồng lấn, không
 * còn hình chữ nhật. Bảng ghi chú là lưới thường nên cách này bao quát chúng; các
 * ô gộp chỉ đơn giản được giữ nguyên.
 *
 * Mọi command dispatch trực tiếp qua view (một lần dispatch có thể dự đoán) thay
 * vì chain TipTap, tránh dispatch hai lần với các command PM thô.
 */

/** Di chuyển hàng hiện tại lên (`-1`) hoặc xuống (`+1`). */
export function moveRow(editor: Editor, dir: -1 | 1): boolean {
  const { state } = editor;
  if (!isInTable(state)) return false;
  const rect = selectedRect(state);
  const to = rect.top + dir;
  if (to < 0 || to >= rect.map.height) return false;
  return moveTableRow({ from: rect.top, to })(state, editor.view.dispatch.bind(editor.view));
}

/** Di chuyển cột hiện tại sang trái (`-1`) hoặc phải (`+1`). */
export function moveColumn(editor: Editor, dir: -1 | 1): boolean {
  const { state } = editor;
  if (!isInTable(state)) return false;
  const rect = selectedRect(state);
  const to = rect.left + dir;
  if (to < 0 || to >= rect.map.width) return false;
  return moveTableColumn({ from: rect.left, to })(state, editor.view.dispatch.bind(editor.view));
}

/** Nhân bản hàng hiện tại ngay bên dưới (không làm gì với hàng gộp rowspan). */
export function duplicateRow(editor: Editor): boolean {
  const { state } = editor;
  if (!isInTable(state)) return false;
  const rect = selectedRect(state);
  const { map, table, tableStart } = rect;
  const row = rect.top;
  for (let col = 0; col < map.width; ) {
    const pos = map.map[row * map.width + col];
    const cell = table.nodeAt(pos);
    if (!cell) return false;
    if (map.findCell(pos).top !== row || (cell.attrs.rowspan ?? 1) > 1) return false;
    col += cell.attrs.colspan ?? 1;
  }
  const srcRow = table.child(row);
  let insertPos = tableStart;
  for (let i = 0; i <= row; i++) insertPos += table.child(i).nodeSize;
  editor.view.dispatch(state.tr.insert(insertPos, srcRow.copy(srcRow.content)));
  return true;
}

/** Nhân bản cột hiện tại sang bên phải (không làm gì với cột có ô gộp). */
export function duplicateColumn(editor: Editor): boolean {
  const { state } = editor;
  if (!isInTable(state)) return false;
  const rect = selectedRect(state);
  const { map, table, tableStart } = rect;
  const col = rect.left;
  const copies: { at: number; node: PMNode }[] = [];
  for (let r = 0; r < map.height; r++) {
    const pos = map.map[r * map.width + col];
    const cell = table.nodeAt(pos);
    if (!cell) return false;
    if (map.findCell(pos).left !== col || (cell.attrs.colspan ?? 1) > 1 || (cell.attrs.rowspan ?? 1) > 1)
      return false;
    copies.push({ at: tableStart + pos + cell.nodeSize, node: cell.type.create(cell.attrs, cell.content) });
  }
  const tr = state.tr;
  // Chèn từ dưới lên để các vị trí ở phía trước (thấp hơn) vẫn hợp lệ.
  for (let i = copies.length - 1; i >= 0; i--) tr.insert(copies[i].at, copies[i].node);
  editor.view.dispatch(tr);
  return true;
}
