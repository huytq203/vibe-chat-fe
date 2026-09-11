import { Editor } from "@tiptap/core";
import CodeBlock from "@tiptap/extension-code-block";
import Document from "@tiptap/extension-document";
import Text from "@tiptap/extension-text";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ComponentProps, type ElementType } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CodeBlockView } from "./CodeBlockView";

vi.mock("@tiptap/react", () => ({
  NodeViewContent: ({ as = "div", ...props }: { as?: ElementType }) => createElement(as, props),
  NodeViewWrapper: ({ as = "div", ...props }: ComponentProps<"div"> & { as?: ElementType }) => (
    createElement(as, props)
  ),
}));

const editors: Editor[] = [];

function codeEditor(language: string, editable = true): Editor {
  const editor = new Editor({
    editable,
    extensions: [Document, Text, CodeBlock],
    content: {
      type: "doc",
      content: [{
        type: "codeBlock",
        attrs: { language },
        content: [{ type: "text", text: "const answer = 42;" }],
      }],
    },
  });
  editors.push(editor);
  return editor;
}

afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy());
});

describe("CodeBlockView", () => {
  it("nên đổi language của khối khi chọn trong select", async () => {
    const editor = codeEditor("text");
    const updateAttributes = vi.fn();
    render(
      <CodeBlockView
        editor={editor}
        node={editor.state.doc.firstChild!}
        updateAttributes={updateAttributes}
      />,
    );

    await userEvent.setup().selectOptions(screen.getByLabelText("Ngôn ngữ đoạn mã"), "javascript");

    expect(updateAttributes).toHaveBeenCalledWith({ language: "javascript" });
  });

  it("nên sao chép nội dung khi bấm Sao chép", async () => {
    const editor = codeEditor("javascript");
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    render(
      <CodeBlockView
        editor={editor}
        node={editor.state.doc.firstChild!}
        updateAttributes={vi.fn()}
      />,
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "Sao chép đoạn mã" }));

    expect(writeText).toHaveBeenCalledWith("const answer = 42;");
    expect(screen.getByRole("button", { name: "Đã sao chép đoạn mã" })).toHaveTextContent("Đã chép");
  });
});
