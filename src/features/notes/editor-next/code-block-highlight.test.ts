import { Editor } from "@tiptap/core";
import CodeBlock from "@tiptap/extension-code-block";
import Document from "@tiptap/extension-document";
import Text from "@tiptap/extension-text";
import { waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CodeBlockHighlight } from "./code-block-highlight";

const mocks = vi.hoisted(() => ({
  codeToTokens: vi.fn(),
  getCodeHighlighter: vi.fn(),
  getLoadedLanguages: vi.fn(() => [] as string[]),
  loadLanguage: vi.fn(() => Promise.resolve()),
}));

vi.mock("shiki", () => ({}));
vi.mock("@/features/notes/lib/code-highlighting", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/notes/lib/code-highlighting")>();
  return { ...actual, getCodeHighlighter: mocks.getCodeHighlighter };
});

interface TestEditor {
  editor: Editor;
  element: HTMLElement;
}

const editors: TestEditor[] = [];

function createEditor(blocks: Array<{ language: string; text: string }>): TestEditor {
  const element = document.createElement("div");
  document.body.appendChild(element);
  const editor = new Editor({
    element,
    extensions: [Document, Text, CodeBlock, CodeBlockHighlight],
    content: {
      type: "doc",
      content: blocks.map(({ language, text }) => ({
        type: "codeBlock",
        attrs: { language },
        content: [{ type: "text", text }],
      })),
    },
  });
  const testEditor = { editor, element };
  editors.push(testEditor);
  return testEditor;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getLoadedLanguages.mockReturnValue([]);
  mocks.loadLanguage.mockResolvedValue();
  mocks.codeToTokens.mockImplementation((text: string) => ({
    tokens: [[{
      content: text,
      htmlStyle: { "--shiki-dark": "#e1e4e8", "--shiki-light": "#24292e" },
      offset: 0,
    }]],
  }));
  mocks.getCodeHighlighter.mockResolvedValue({
    codeToTokens: mocks.codeToTokens,
    getLoadedLanguages: mocks.getLoadedLanguages,
    loadLanguage: mocks.loadLanguage,
  });
});

afterEach(() => {
  editors.splice(0).forEach(({ editor, element }) => {
    element.remove();
    editor.destroy();
  });
});

describe("code block highlight", () => {
  it("nên rơi về text và KHÔNG ném lỗi khi language là 'js' hay chuỗi lạ", async () => {
    mocks.codeToTokens.mockImplementationOnce(() => {
      throw new Error("Language js is not supported");
    });
    const { element } = createEditor([
      { language: "js", text: "const safe = true;" },
      { language: "khong-ton-tai", text: "plain" },
    ]);

    await waitFor(() => expect(mocks.codeToTokens).toHaveBeenCalledTimes(1));
    expect(mocks.loadLanguage).toHaveBeenCalledWith("javascript");
    expect(mocks.loadLanguage).not.toHaveBeenCalledWith("js");
    expect(mocks.loadLanguage).not.toHaveBeenCalledWith("khong-ton-tai");
    expect(element.querySelector(".notes-editor-next__code-token")).toBeNull();
    expect(element).toHaveTextContent("const safe = true;");
  });

  it("nên tạo decoration tô màu sau khi highlighter sẵn sàng", async () => {
    let release: ((value: {
      codeToTokens: typeof mocks.codeToTokens;
      getLoadedLanguages: typeof mocks.getLoadedLanguages;
      loadLanguage: typeof mocks.loadLanguage;
    }) => void) | undefined;
    mocks.getCodeHighlighter.mockReturnValue(new Promise((resolve) => {
      release = resolve;
    }));
    const { element } = createEditor([{ language: "ts", text: "const ready = true;" }]);

    expect(element.querySelector(".notes-editor-next__code-token")).toBeNull();
    release?.({
      codeToTokens: mocks.codeToTokens,
      getLoadedLanguages: mocks.getLoadedLanguages,
      loadLanguage: mocks.loadLanguage,
    });

    await waitFor(() => {
      const token = element.querySelector<HTMLElement>(
        ".notes-editor-next__code-token",
      );
      expect(token?.style.getPropertyValue("--shiki-light")).toBe("#24292e");
    });
  });

  it("nên không tô lại khối khác khi gõ ở một khối", async () => {
    const { editor } = createEditor([
      { language: "typescript", text: "const first = 1;" },
      { language: "typescript", text: "const second = 2;" },
    ]);
    await waitFor(() => expect(mocks.codeToTokens).toHaveBeenCalledTimes(2));

    editor.commands.setTextSelection(2);
    editor.commands.insertContent("X");

    await waitFor(() => expect(mocks.codeToTokens).toHaveBeenCalledTimes(3));
    expect(mocks.codeToTokens.mock.calls.filter(([text]) => text === "const second = 2;"))
      .toHaveLength(1);
  });
});
