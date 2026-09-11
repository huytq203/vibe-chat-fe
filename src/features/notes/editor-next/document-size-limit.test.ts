import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Doc as YDoc } from "yjs";

import {
  DOCUMENT_LIMIT_BYTES,
  DOCUMENT_WARNING_BYTES,
} from "@/features/notes/constants";

import { DocumentSizeLimit } from "./document-size-limit";

const mocks = vi.hoisted(() => ({
  bytes: vi.fn(() => 0),
  error: vi.fn(),
  warning: vi.fn(),
}));

vi.mock("@/lib/collab", () => ({ collabDocumentUpdateBytes: mocks.bytes }));
vi.mock("sonner", () => ({ toast: { error: mocks.error, warning: mocks.warning } }));

const editors: Editor[] = [];

function createEditor(doc: YDoc): Editor {
  const editor = new Editor({
    element: document.createElement("div"),
    extensions: [Document, Paragraph, Text, DocumentSizeLimit.configure({ doc })],
  });
  editors.push(editor);
  return editor;
}

afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy());
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("giới hạn dung lượng tài liệu", () => {
  it("nên cảnh báo một lần khi tài liệu vượt 3MB", () => {
    vi.useFakeTimers();
    const doc = new YDoc();
    createEditor(doc);
    mocks.bytes.mockReturnValue(DOCUMENT_WARNING_BYTES + 1);

    doc.getMap("test").set("one", 1);
    doc.getMap("test").set("two", 2);
    vi.advanceTimersByTime(3_000);
    doc.getMap("test").set("three", 3);
    vi.advanceTimersByTime(3_000);

    expect(mocks.warning).toHaveBeenCalledTimes(1);
  });

  it("nên chặn khi vượt 5MB", () => {
    mocks.bytes.mockReturnValue(DOCUMENT_LIMIT_BYTES + 1);
    const editor = createEditor(new YDoc());

    editor.commands.insertContent("Không được chèn");

    expect(editor.getText()).toBe("");
    expect(mocks.error).toHaveBeenCalledWith(
      "Không thể thêm nội dung vì tài liệu đã vượt giới hạn 5 MB.",
    );
  });
});
