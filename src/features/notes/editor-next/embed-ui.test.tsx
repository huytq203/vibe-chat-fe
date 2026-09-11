import { Editor, type Range } from "@tiptap/core";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { handleEmbedPaste, type EmbedPasteSuggestion } from "./embed-paste";
import { NOTE_EDITOR_BASE_EXTENSIONS } from "./extensions";
import { PasteEmbedPrompt } from "./PasteEmbedPrompt";
import { filterSlashItems } from "./slash-items";
import { SuggestionUrlPrompt } from "./suggestion-url-prompt";

const editors: Editor[] = [];

function createEditor(): Editor {
  const editor = new Editor({ extensions: NOTE_EDITOR_BASE_EXTENSIONS });
  editors.push(editor);
  return editor;
}

function pasteEvent(url: string) {
  return {
    clipboardData: { getData: (format: string) => format === "text/plain" ? url : "" },
    preventDefault: vi.fn(),
  };
}

function pasteEmbedUrl(editor: Editor, url: string): EmbedPasteSuggestion {
  const suggestions: EmbedPasteSuggestion[] = [];
  handleEmbedPaste(editor.view, pasteEvent(url), (value) => suggestions.push(value));
  const suggestion = suggestions[0];
  if (!suggestion) throw new Error("Thiếu gợi ý nhúng sau khi dán URL hợp lệ");
  return suggestion;
}

afterEach(() => editors.splice(0).forEach((editor) => editor.destroy()));

describe("giao diện chèn embed", () => {
  it("nên chèn node embed khi nhập URL YouTube hợp lệ qua /youtube", async () => {
    const editor = createEditor();
    const item = filterSlashItems("youtube")[0];
    const range: Range = { from: 1, to: 1 };
    const command = vi.fn((selected: NonNullable<typeof item>) => selected.run(editor, range));
    if (!item) throw new Error("Thiếu slash item YouTube");

    render(<SuggestionUrlPrompt command={command} editor={editor} item={item} onClose={vi.fn()} range={range} />);
    await userEvent.type(
      screen.getByRole("textbox", { name: "URL nội dung nhúng" }),
      "https://youtu.be/dQw4w9WgXcQ",
    );
    await userEvent.click(screen.getByRole("button", { name: "Nhúng" }));

    expect(editor.getJSON().content?.[0]).toMatchObject({
      type: "embed",
      attrs: { provider: "youtube", src: "https://www.youtube.com/embed/dQw4w9WgXcQ" },
    });
  });

  it("nên từ chối và giữ ô nhập khi URL không thuộc provider", async () => {
    const editor = createEditor();
    const item = filterSlashItems("youtube")[0];
    const command = vi.fn();
    if (!item) throw new Error("Thiếu slash item YouTube");

    render(<SuggestionUrlPrompt command={command} editor={editor} item={item} onClose={vi.fn()} range={{ from: 1, to: 1 }} />);
    const input = screen.getByRole("textbox", { name: "URL nội dung nhúng" });
    await userEvent.type(input, "https://vimeo.com/76979871");
    await userEvent.click(screen.getByRole("button", { name: "Nhúng" }));

    expect(screen.getByRole("alert")).toHaveTextContent("URL không thuộc dịch vụ hỗ trợ");
    expect(input).toHaveValue("https://vimeo.com/76979871");
    expect(command).not.toHaveBeenCalled();
  });

  it("nên xoá đoạn link khi chọn Nhúng", async () => {
    const editor = createEditor();
    const suggestion = pasteEmbedUrl(editor, "https://vimeo.com/76979871");

    expect(editor.getHTML()).toContain('<a target="_blank" rel="noopener noreferrer nofollow" href="https://vimeo.com/76979871"');
    render(<PasteEmbedPrompt editor={editor} onClose={vi.fn()} suggestion={suggestion} />);
    await userEvent.click(screen.getByRole("button", { name: "Nhúng" }));

    expect(editor.getHTML()).not.toContain("<a");
    expect(editor.getHTML()).not.toContain("https://vimeo.com/76979871");
    expect(editor.getJSON().content?.[0]).toMatchObject({
      type: "embed",
      attrs: { provider: "vimeo", src: "https://player.vimeo.com/video/76979871" },
    });
  });

  it("nên giữ link khi chọn Giữ link", () => {
    const editor = createEditor();
    const suggestion = pasteEmbedUrl(editor, "https://vimeo.com/76979871");
    render(<PasteEmbedPrompt editor={editor} onClose={vi.fn()} suggestion={suggestion} />);

    fireEvent.click(screen.getByRole("button", { name: "Giữ link" }));

    expect(editor.getJSON().content?.[0]?.content?.[0]).toMatchObject({
      marks: [{ type: "link", attrs: { href: "https://vimeo.com/76979871" } }],
      text: "https://vimeo.com/76979871",
      type: "text",
    });
  });
});
