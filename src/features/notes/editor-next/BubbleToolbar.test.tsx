import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Editor } from "@tiptap/core";
import type { BubbleMenuProps } from "@tiptap/react/menus";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { BubbleToolbar, shouldShowBubbleToolbar } from "./BubbleToolbar";
import { NOTE_EDITOR_BASE_EXTENSIONS } from "./extensions";

vi.mock("@tiptap/react/menus", () => ({
  BubbleMenu: ({ children }: BubbleMenuProps & { children: ReactNode }) => <>{children}</>,
}));

const editors: Editor[] = [];

beforeAll(() => {
  Object.defineProperty(Range.prototype, "getClientRects", {
    configurable: true,
    value: () => [],
  });
  Object.defineProperty(Range.prototype, "getBoundingClientRect", {
    configurable: true,
    value: () => new DOMRect(),
  });
});

function createEditor(content = "<p>Đoạn văn kiểm thử</p>"): Editor {
  const editor = new Editor({ content, extensions: NOTE_EDITOR_BASE_EXTENSIONS });
  document.body.append(editor.view.dom);
  editors.push(editor);
  return editor;
}

function selectText(editor: Editor): void {
  editor.chain().focus().setTextSelection({ from: 1, to: 5 }).run();
}

function shouldShow(editor: Editor): boolean {
  const { from, to } = editor.state.selection;
  return shouldShowBubbleToolbar({
    editor,
    element: document.body,
    from,
    state: editor.state,
    to,
    view: editor.view,
  });
}

afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy());
});

describe("BubbleToolbar", () => {
  it("nên hiện bubble menu khi bôi đen chữ", () => {
    const editor = createEditor();
    selectText(editor);
    render(<BubbleToolbar editor={editor} />);

    expect(shouldShow(editor)).toBe(true);
    expect(screen.getByRole("toolbar", { name: "Định dạng văn bản" })).toBeInTheDocument();
  });

  it("nên không hiện khi vùng chọn rỗng", () => {
    const editor = createEditor();
    render(<BubbleToolbar editor={editor} />);

    expect(shouldShow(editor)).toBe(false);
  });

  it("nên bật đậm cho vùng chọn khi bấm B, và nút B ở trạng thái pressed", async () => {
    const editor = createEditor();
    selectText(editor);
    const view = render(<BubbleToolbar editor={editor} />);

    await userEvent.click(screen.getByRole("button", { name: "Đậm" }));
    view.rerender(<BubbleToolbar editor={editor} />);

    expect(editor.isActive("bold")).toBe(true);
    expect(screen.getByRole("button", { name: "Đậm" })).toHaveAttribute("aria-pressed", "true");
  });

  it("nên áp màu chữ đã chọn vào vùng chọn", async () => {
    const editor = createEditor();
    selectText(editor);
    render(<BubbleToolbar editor={editor} />);

    await userEvent.click(screen.getByRole("button", { name: "Màu chữ" }));
    await userEvent.click(screen.getByRole("button", { name: "Màu chữ: Lục" }));

    expect(editor.getAttributes("textStyle").color).toBe("var(--note-text-green)");
  });

  it("nên gỡ màu khi chọn Mặc định", async () => {
    const editor = createEditor();
    selectText(editor);
    editor.chain().setColor("var(--note-text-green)").run();
    render(<BubbleToolbar editor={editor} />);

    await userEvent.click(screen.getByRole("button", { name: "Màu chữ" }));
    await userEvent.click(screen.getByRole("button", { name: "Màu chữ: Mặc định" }));

    expect(editor.getAttributes("textStyle").color).toBeUndefined();
  });

  it("nên áp highlight vào vùng chọn", async () => {
    const editor = createEditor();
    selectText(editor);
    render(<BubbleToolbar editor={editor} />);

    await userEvent.click(screen.getByRole("button", { name: "Highlight" }));
    await userEvent.click(screen.getByRole("button", { name: "Highlight: Vàng" }));

    expect(editor.getHTML()).toContain('data-color="yellow"');
  });

  it("nên đặt link với URL nhập vào khi Enter", async () => {
    const editor = createEditor();
    selectText(editor);
    render(<BubbleToolbar editor={editor} />);

    await userEvent.click(screen.getByRole("button", { name: "Liên kết" }));
    await userEvent.type(screen.getByRole("textbox", { name: "URL liên kết" }), "example.com{Enter}");

    expect(editor.getAttributes("link").href).toBe("https://example.com");
  });

  it("nên gỡ link khi bấm gỡ", async () => {
    const editor = createEditor('<p><a href="https://example.com">Đoạn</a> văn</p>');
    selectText(editor);
    render(<BubbleToolbar editor={editor} />);

    await userEvent.click(screen.getByRole("button", { name: "Liên kết" }));
    await userEvent.click(screen.getByRole("button", { name: "Gỡ liên kết" }));

    expect(editor.getHTML()).not.toContain("<a");
  });

  it("nên ghi màu chữ dưới dạng biến CSS theo tên, không phải hex", () => {
    const editor = createEditor();
    selectText(editor);
    editor.chain().setColor("var(--note-text-blue)").run();

    expect(editor.getHTML()).toContain("var(--note-text-blue)");
    expect(editor.getHTML()).not.toMatch(/color:\s*#/);
  });

  it("nên ghi highlight bằng data-color theo tên", () => {
    const editor = createEditor();
    selectText(editor);
    editor.chain().setHighlight({ color: "purple" }).run();

    expect(editor.getHTML()).toContain('data-color="purple"');
    expect(editor.getHTML()).not.toContain("background-color");
  });

  it("nên không dùng token ngoài hệ thiết kế", () => {
    const files = ["BubbleToolbar.tsx", "ColorPalette.tsx", "LinkEditor.tsx"];
    const source = files.map((file) => readFileSync(resolve(__dirname, file), "utf8")).join("\n");

    const forbiddenToken = new RegExp(["(?:bg|text|border)-", "tz", "-"].join(""));
    expect(source).not.toMatch(forbiddenToken);
  });

  it("nên đóng bảng màu trước khi đóng bubble bằng Escape", async () => {
    const editor = createEditor();
    selectText(editor);
    render(<BubbleToolbar editor={editor} />);
    await userEvent.click(screen.getByRole("button", { name: "Màu chữ" }));

    fireEvent.keyDown(screen.getByRole("toolbar"), { key: "Escape" });

    expect(screen.getByRole("button", { name: "Màu chữ" })).toBeInTheDocument();
  });
});
