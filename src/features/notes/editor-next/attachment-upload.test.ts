import { Editor } from "@tiptap/core";
import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AttachmentUploadPlaceholder,
  handleFileDrop,
  handleFilePaste,
} from "./attachment-upload";
import { NOTE_EDITOR_BASE_EXTENSIONS } from "./extensions";

const toastError = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({ toast: { error: toastError } }));

const editors: Editor[] = [];

function createEditor(): Editor {
  const editor = new Editor({
    element: document.createElement("div"),
    extensions: [...NOTE_EDITOR_BASE_EXTENSIONS, AttachmentUploadPlaceholder],
  });
  editors.push(editor);
  return editor;
}

function pasteEvent(file: File): ClipboardEvent {
  return {
    clipboardData: { files: [file] },
    preventDefault: vi.fn(),
  } as unknown as ClipboardEvent;
}

function dropEvent(file: File): DragEvent {
  return {
    clientX: 0,
    clientY: 0,
    dataTransfer: { files: [file] },
    preventDefault: vi.fn(),
  } as unknown as DragEvent;
}

afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy());
  vi.clearAllMocks();
});

describe("tải tệp vào editor", () => {
  it("nên gọi uploadFile và chèn image src attachment:// khi dán ảnh", async () => {
    const editor = createEditor();
    const file = new File(["image"], "ảnh.png", { type: "image/png" });
    const uploadFile = vi.fn().mockResolvedValue("attachment://att-image");

    expect(handleFilePaste(editor.view, pasteEvent(file), uploadFile)).toBe(true);
    expect(editor.view.dom.querySelector(".notes-editor-next__upload-placeholder"))
      .not.toBeNull();

    await waitFor(() => expect(editor.getJSON().content?.[0]).toMatchObject({
      attrs: { alt: "ảnh.png", src: "attachment://att-image" },
      type: "image",
    }));
    expect(uploadFile).toHaveBeenCalledWith(file);
  });

  it("nên chèn link tên tệp khi kéo-thả tệp không phải ảnh", async () => {
    const editor = createEditor();
    const file = new File(["report"], "báo-cáo.pdf", { type: "application/pdf" });
    const uploadFile = vi.fn().mockResolvedValue("attachment://att-file");
    vi.spyOn(editor.view, "posAtCoords").mockReturnValue({ inside: 0, pos: 1 });

    expect(handleFileDrop(editor.view, dropEvent(file), uploadFile)).toBe(true);

    await waitFor(() => expect(editor.getJSON().content?.[0]?.content?.[0]).toMatchObject({
      marks: [{ attrs: { href: "attachment://att-file" }, type: "link" }],
      text: "báo-cáo.pdf",
      type: "text",
    }));
  });

  it("nên không chèn gì và báo lỗi khi upload thất bại", async () => {
    const editor = createEditor();
    const file = new File(["image"], "lỗi.png", { type: "image/png" });
    const uploadFile = vi.fn().mockRejectedValue(new Error("Không tải được tệp"));

    handleFilePaste(editor.view, pasteEvent(file), uploadFile);

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Không tải được tệp"));
    expect(editor.getJSON()).toMatchObject({
      content: [{ type: "paragraph" }],
      type: "doc",
    });
    expect(editor.view.dom.querySelector(".notes-editor-next__upload-placeholder"))
      .toBeNull();
  });
});
