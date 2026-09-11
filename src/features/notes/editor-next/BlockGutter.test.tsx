import { act, render } from "@testing-library/react";
import type { Editor } from "@tiptap/react";
import type { Node } from "@tiptap/pm/model";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BlockGutter } from "./BlockGutter";

type NodeChange = (data: { editor: Editor; node: Node | null; pos: number }) => void;

const dragHandleState = vi.hoisted((): { onNodeChange?: NodeChange } => ({}));

vi.mock("@tiptap/extension-drag-handle-react", () => ({
  DragHandle: ({ children, onNodeChange }: {
    children: ReactNode;
    onNodeChange?: NodeChange;
  }) => {
    dragHandleState.onNodeChange = onNodeChange;
    return <div>{children}</div>;
  },
}));

const blockNode = { nodeSize: 3 } as unknown as Node;

function createBlock(paddingTop: string, lineHeight: string): HTMLElement {
  const block = document.createElement("h1");
  block.style.paddingTop = paddingTop;
  block.style.lineHeight = lineHeight;
  block.textContent = "Tiêu đề";
  return block;
}

function createEditor(blocks: Map<number, HTMLElement>): Editor {
  const dom = document.createElement("div");
  return {
    view: {
      dom,
      nodeDOM: vi.fn((pos: number) => blocks.get(pos) ?? null),
    },
  } as unknown as Editor;
}

function pointAtBlock(editor: Editor, pos: number): void {
  act(() => dragHandleState.onNodeChange?.({ editor, node: blockNode, pos }));
}

function getGutterContent(container: HTMLElement): HTMLElement {
  const content = container.querySelector<HTMLElement>(".notes-editor-next__gutter-content");
  if (!content) throw new Error("Không tìm thấy nội dung gutter");
  return content;
}

beforeEach(() => {
  dragHandleState.onNodeChange = undefined;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    () => DOMRect.fromRect({ height: 24 }),
  );
});

describe("BlockGutter", () => {
  it("nên canh tâm tay cầm với tâm dòng chữ đầu khi khối là tiêu đề lớn", () => {
    const editor = createEditor(new Map([[1, createBlock("8px", "36px")]]));
    const { container } = render(<BlockGutter editor={editor} />);

    pointAtBlock(editor, 1);

    expect(getGutterContent(container)).toHaveStyle({ transform: "translateY(14px)" });
  });

  it("nên canh đúng với đoạn văn khi chiều cao dòng bằng chiều cao gutter", () => {
    const editor = createEditor(new Map([[1, createBlock("8px", "24px")]]));
    const { container } = render(<BlockGutter editor={editor} />);

    pointAtBlock(editor, 1);

    expect(getGutterContent(container)).toHaveStyle({ transform: "translateY(8px)" });
  });

  it("nên tính lại khi đổi khối đang trỏ", () => {
    const blocks = new Map([
      [1, createBlock("8px", "36px")],
      [2, createBlock("8px", "24px")],
    ]);
    const editor = createEditor(blocks);
    const { container } = render(<BlockGutter editor={editor} />);

    pointAtBlock(editor, 1);
    expect(getGutterContent(container)).toHaveStyle({ transform: "translateY(14px)" });

    pointAtBlock(editor, 2);
    expect(getGutterContent(container)).toHaveStyle({ transform: "translateY(8px)" });
  });

  it("nên tính lại khi cửa sổ đổi kích thước", () => {
    const block = createBlock("8px", "36px");
    const editor = createEditor(new Map([[1, block]]));
    const { container } = render(<BlockGutter editor={editor} />);
    pointAtBlock(editor, 1);

    block.style.lineHeight = "24px";
    act(() => window.dispatchEvent(new Event("resize")));

    expect(getGutterContent(container)).toHaveStyle({ transform: "translateY(8px)" });
  });
});
