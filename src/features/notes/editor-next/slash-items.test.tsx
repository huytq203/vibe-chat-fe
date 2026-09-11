import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NOTE_EDITOR_BASE_EXTENSIONS } from "./extensions";
import { filterSlashItems, normalizeQuery } from "./slash-items";

const editors: Editor[] = [];

function createEditor(): Editor {
  const editor = new Editor({ extensions: NOTE_EDITOR_BASE_EXTENSIONS });
  editors.push(editor);
  return editor;
}

afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy());
  vi.useRealTimers();
});

describe("normalizeQuery", () => {
  it("nên bỏ dấu và đổi đ thành d", () => {
    expect(normalizeQuery("  Tiêu Đề Đậm  ")).toBe("tieu de dam");
  });
});

describe("lệnh gạch chéo", () => {
  it("nên gợi ý Tiêu đề 1 ở đầu khi gõ h1", () => {
    expect(filterSlashItems("h1")[0]?.title).toBe("Tiêu đề 1");
  });

  it("nên gợi ý Bảng khi gõ bang không dấu", () => {
    expect(filterSlashItems("bang")[0]?.title).toBe("Bảng");
  });

  it("nên xếp khớp đầu chuỗi trước khớp giữa chuỗi", () => {
    const results = filterSlashItems("nhan");
    const startsAt = results.findIndex((item) => item.id === "duplicate");
    const middleAt = results.findIndex((item) => item.id === "table-quick");

    expect(startsAt).toBeGreaterThanOrEqual(0);
    expect(middleAt).toBeGreaterThan(startsAt);
  });

  it("nên chèn tiêu đề 4 khi chọn Tiêu đề 4", () => {
    const editor = createEditor();
    const item = filterSlashItems("h4")[0];

    item?.run(editor, { from: 1, to: 1 });

    expect(editor.getJSON().content?.[0]).toMatchObject({
      attrs: { level: 4 },
      type: "heading",
    });
  });

  it("nên chèn ngày hôm nay đúng định dạng dd/MM/yyyy", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 11, 12));
    const editor = createEditor();
    const item = filterSlashItems("today")[0];

    item?.run(editor, { from: 1, to: 1 });

    expect(editor.getText()).toBe("11/09/2026");
  });
});
