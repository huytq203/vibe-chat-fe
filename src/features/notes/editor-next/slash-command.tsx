"use client";

import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";

import type { UploadFile } from "./attachment-upload";
import type { SlashCommandStorage } from "./slash-command-storage";
import { filterSlashItems } from "./slash-items";
import { makeSuggestionRender, type SuggestionItem } from "./suggestion-popup";

/**
 * Menu lệnh `/` kiểu Notion: nhập `/` rồi nhập từ khóa để chèn một khối.
 * Mỗi mục xóa vùng `/truy-vấn` đã nhập trước rồi mới chạy thao tác chèn.
 */
interface SlashCommandOptions {
  uploadFile: UploadFile | null;
}

export const SlashCommand = Extension.create<SlashCommandOptions, SlashCommandStorage>({
  name: "slashCommand",
  addOptions: () => ({ uploadFile: null }),
  addStorage(): SlashCommandStorage {
    return { openTableGrid: null, uploadFile: this.options.uploadFile };
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
