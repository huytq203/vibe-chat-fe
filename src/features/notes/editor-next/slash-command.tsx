"use client";

import { type Editor, Extension, type Range } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";

import { filterSlashItems } from "./slash-items";
import { makeSuggestionRender, type SuggestionItem } from "./suggestion-popup";

/**
 * Menu lệnh `/` kiểu Notion: nhập `/` rồi nhập từ khóa để chèn một khối.
 * Mỗi mục xóa vùng `/truy-vấn` đã nhập trước rồi mới chạy thao tác chèn.
 */
/** Khe cầu nối để editor đang chạy cho phép mục `/` kích hoạt overlay React
 *  bộ chọn kích thước bảng nằm ngoài extension. */
export interface SlashCommandStorage {
  openTableGrid: ((range: Range) => void) | null;
}

/** Đọc storage của extension này từ editor mà không xung đột với kiểu chỉ mục
 *  `Storage` của TipTap (storage của extension không nằm trong interface toàn cục). */
export function slashCommandStorage(editor: Editor): SlashCommandStorage | undefined {
  return (editor.storage as unknown as Record<string, SlashCommandStorage | undefined>)
    .slashCommand;
}

export const SlashCommand = Extension.create({
  name: "slashCommand",
  addStorage(): SlashCommandStorage {
    return { openTableGrid: null };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion<SuggestionItem>({
        editor: this.editor,
        char: "/",
        // Chỉ kích hoạt ở đầu khối rỗng hoặc sau khoảng trắng để dấu `/` giữa
        // một từ (ví dụ URL hoặc ngày tháng) không mở menu.
        allowedPrefixes: null,
        startOfLine: false,
        command: ({ editor, range, props }) => props.run(editor, range),
        floatingUi: { strategy: "fixed" },
        flip: true,
        items: ({ query }) => filterSlashItems(query),
        render: makeSuggestionRender(),
      }),
    ];
  },
});
