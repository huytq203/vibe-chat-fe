import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Editor } from "@tiptap/react";
import type { Node } from "@tiptap/pm/model";
import { GripVertical } from "lucide-react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { useNotesUiStore } from "@/features/notes/stores/notes-ui.store";

import { BlockMenu, type ActiveBlock } from "./BlockMenu";
import { NOTE_EDITOR_BASE_EXTENSIONS } from "./extensions";

function createEditorMock() {
  const commands = {
    clearNodes: vi.fn(),
    deleteRange: vi.fn(),
    focus: vi.fn(),
    insertContentAt: vi.fn(),
    run: vi.fn(() => true),
    setCodeBlock: vi.fn(),
    setHeading: vi.fn(),
    setParagraph: vi.fn(),
    setTextSelection: vi.fn(),
    toggleBlockquote: vi.fn(),
    toggleBulletList: vi.fn(),
    toggleOrderedList: vi.fn(),
  };
  [
    commands.clearNodes,
    commands.deleteRange,
    commands.focus,
    commands.insertContentAt,
    commands.setCodeBlock,
    commands.setHeading,
    commands.setParagraph,
    commands.setTextSelection,
    commands.toggleBlockquote,
    commands.toggleBulletList,
    commands.toggleOrderedList,
  ].forEach((command) => command.mockReturnValue(commands));
  commands.run.mockReturnValue(true);
  return {
    commands,
    editor: { chain: vi.fn(() => commands) } as unknown as Editor,
  };
}

const nodeJson = {
  type: "paragraph",
  content: [{ type: "text", text: "Khối đang trỏ" }],
};
const block: ActiveBlock = {
  node: { nodeSize: 7, textContent: "Khối đang trỏ", toJSON: () => nodeJson } as unknown as Node,
  pos: 10,
};

function MenuHarness({ activeBlock = block, editor }: { activeBlock?: ActiveBlock; editor: Editor }) {
  const [open, setOpen] = useState(false);
  return (
    <BlockMenu block={activeBlock} editor={editor} open={open} onOpenChange={setOpen}>
      <GripVertical aria-hidden="true" />
    </BlockMenu>
  );
}

async function openMenu(editor: Editor, activeBlock?: ActiveBlock) {
  const user = userEvent.setup();
  render(<MenuHarness activeBlock={activeBlock} editor={editor} />);
  await user.click(screen.getByRole("button", { name: "Mở menu khối hoặc kéo để di chuyển" }));
  return user;
}

function createRealEditor(text = "Khối đang trỏ"): { block: ActiveBlock; editor: Editor } {
  const editor = new Editor({
    content: { type: "doc", content: [{ type: "paragraph", content: text
      ? [{ type: "text", text }]
      : undefined }] },
    extensions: NOTE_EDITOR_BASE_EXTENSIONS,
  });
  const firstBlock = editor.state.doc.firstChild;
  if (!firstBlock) throw new Error("Thiếu khối kiểm thử");
  return { block: { node: firstBlock, pos: 0 }, editor };
}

describe("BlockMenu", () => {
  it("nên mở menu khối khi bấm tay cầm mà không kéo", async () => {
    const { editor } = createEditorMock();
    await openMenu(editor);

    expect(await screen.findByRole("menuitem", { name: "Xoá khối" })).toBeInTheDocument();
  });

  it("nên xoá đúng khối đang trỏ khi chọn Xoá (không xoá khối chứa con trỏ)", async () => {
    const { commands, editor } = createEditorMock();
    const user = await openMenu(editor);
    await user.click(await screen.findByRole("menuitem", { name: "Xoá khối" }));

    expect(commands.deleteRange).toHaveBeenCalledWith({ from: 10, to: 17 });
  });

  it("nên nhân đôi khối ngay bên dưới khi chọn Nhân đôi", async () => {
    const { commands, editor } = createEditorMock();
    const user = await openMenu(editor);
    await user.click(await screen.findByRole("menuitem", { name: "Nhân đôi khối" }));

    expect(commands.insertContentAt).toHaveBeenCalledWith(17, nodeJson);
  });

  it("nên đổi khối thành tiêu đề 2 khi chọn trong Đổi thành", async () => {
    const { commands, editor } = createEditorMock();
    const user = await openMenu(editor);
    await user.hover(await screen.findByRole("menuitem", { name: "Đổi thành" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Tiêu đề 2" }));

    expect(commands.setTextSelection).toHaveBeenCalledWith({ from: 11, to: 16 });
    expect(commands.clearNodes).toHaveBeenCalledOnce();
    expect(commands.setHeading).toHaveBeenCalledWith({ level: 2 });
  });

  it("nên áp màu chữ cho cả khối khi chọn màu trong menu khối", async () => {
    const { block: realBlock, editor } = createRealEditor();
    const user = await openMenu(editor, realBlock);
    await user.hover(await screen.findByRole("menuitem", { name: "Màu" }));
    fireEvent.click(await screen.findByRole("button", { name: "Màu chữ: Lục" }));

    expect(editor.getHTML()).toContain(
      '<span style="color: var(--note-text-green);">Khối đang trỏ</span>',
    );
    editor.destroy();
  });

  it("nên giữ màu khi gõ tiếp trong khối vừa chọn màu", async () => {
    const { block: realBlock, editor } = createRealEditor();
    const user = await openMenu(editor, realBlock);
    await user.hover(await screen.findByRole("menuitem", { name: "Màu" }));
    fireEvent.click(await screen.findByRole("button", { name: "Màu chữ: Lam" }));
    editor.commands.insertContent(" tiếp");

    expect(editor.getHTML()).toContain(
      '<span style="color: var(--note-text-blue);">Khối đang trỏ tiếp</span>',
    );
    editor.destroy();
  });

  it("nên mở tab AI với ô nhập điền sẵn nội dung khối khi chọn Hỏi AI, và gọi setSidePanelTab TRƯỚC setSidePanelOpen", async () => {
    const { editor } = createEditorMock();
    const state = useNotesUiStore.getState();
    const setSidePanelTab = vi.spyOn(state, "setSidePanelTab");
    const setSidePanelOpen = vi.spyOn(state, "setSidePanelOpen");
    const user = await openMenu(editor);
    await user.click(await screen.findByRole("menuitem", { name: "Hỏi AI" }));

    expect(useNotesUiStore.getState().aiComposerDraft).toBe("> Khối đang trỏ\n\n");
    expect(setSidePanelTab).toHaveBeenCalledWith("ai");
    expect(setSidePanelOpen).toHaveBeenCalledWith(true);
    expect(setSidePanelTab.mock.invocationCallOrder[0])
      .toBeLessThan(setSidePanelOpen.mock.invocationCallOrder[0]);
  });

  it("nên không dùng token ngoài hệ thiết kế", () => {
    const source = readFileSync(resolve(__dirname, "BlockMenu.tsx"), "utf8");
    const forbiddenToken = new RegExp(["(?:bg|text|border)-", "tz", "-"].join(""));

    expect(source).not.toMatch(forbiddenToken);
  });
});
