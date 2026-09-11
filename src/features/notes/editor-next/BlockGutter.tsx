"use client";

import { DragHandle } from "@tiptap/extension-drag-handle-react";
import type { Editor } from "@tiptap/react";
import { GripVertical, Plus } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type MouseEvent,
} from "react";

import { Button } from "@/components/ui/button/Button";

import { BlockMenu, type ActiveBlock } from "./BlockMenu";

function getFirstLineHeight(element: HTMLElement): number {
  const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
  if (Number.isFinite(lineHeight)) return lineHeight;

  // `normal` không có giá trị pixel, nên đo hộp chữ của dòng đầu tiên.
  const range = document.createRange();
  range.selectNodeContents(element);
  return Array.from(range.getClientRects())[0]?.height ?? 0;
}

function useGutterAlignment() {
  const gutterContentRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const [offsetY, setOffsetY] = useState(0);
  const updateOffset = useCallback(() => {
    const gutterContent = gutterContentRef.current;
    const target = targetRef.current;
    if (!gutterContent || !target) return;

    const paddingTop = parseFloat(getComputedStyle(target).paddingTop) || 0;
    const gutterHeight = gutterContent.getBoundingClientRect().height;
    const lineHeight = getFirstLineHeight(target) || gutterHeight;
    setOffsetY(paddingTop + (lineHeight - gutterHeight) / 2);
  }, []);
  const setTarget = useCallback((target: HTMLElement | null) => {
    targetRef.current = target;
    if (!target) {
      setOffsetY(0);
      return;
    }
    updateOffset();
  }, [updateOffset]);
  useEffect(() => {
    window.addEventListener("resize", updateOffset);
    return () => window.removeEventListener("resize", updateOffset);
  }, [updateOffset]);
  return { gutterContentRef, offsetY, setTarget };
}

function useBlockGutter(editor: Editor) {
  const activeBlock = useRef<ActiveBlock | null>(null);
  const editorDom = useRef<HTMLElement | null>(null);
  const dragResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging = useRef(false);
  const { gutterContentRef, offsetY, setTarget } = useGutterAlignment();
  const [menuBlock, setMenuBlock] = useState<ActiveBlock | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const handleNodeChange = useCallback(
    ({ node, pos }: Parameters<NonNullable<ComponentProps<typeof DragHandle>["onNodeChange"]>>[0]) => {
      activeBlock.current = node ? { node, pos } : null;
      const nodeDom = node ? editor.view.nodeDOM(pos) : null;
      setTarget(nodeDom instanceof HTMLElement ? nodeDom : null);
      setIsActive(Boolean(node));
    },
    [editor, setTarget],
  );
  const handleMenuOpenChange = (open: boolean) => {
    if (open && (isDragging.current || !activeBlock.current)) return;
    if (open) setMenuBlock(activeBlock.current);
    setIsMenuOpen(open);
    editor.view.dispatch(editor.state.tr.setMeta("lockDragHandle", open));
  };
  const handleDragStart = () => {
    isDragging.current = true;
    if (editorDom.current) editorDom.current.dataset.blockDragging = "true";
    setIsMenuOpen(false);
  };
  const handleDragEnd = () => {
    // Giữ cờ đến sau sự kiện click được trình duyệt phát cuối thao tác kéo.
    if (dragResetTimer.current) clearTimeout(dragResetTimer.current);
    dragResetTimer.current = setTimeout(() => {
      isDragging.current = false;
      if (editorDom.current) delete editorDom.current.dataset.blockDragging;
    }, 0);
  };
  useEffect(() => {
    editorDom.current = editor.view?.dom ?? null;
    return () => {
      if (dragResetTimer.current) clearTimeout(dragResetTimer.current);
      if (editorDom.current) delete editorDom.current.dataset.blockDragging;
      editorDom.current = null;
    };
  }, [editor]);
  const handleInsertMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    // Giữ vùng chọn hiện tại và không để phần tử kéo cha bắt đầu drag.
    event.preventDefault();
    event.stopPropagation();
  };
  const handleInsert = () => {
    const block = activeBlock.current;
    if (!block) return;
    editor.chain().focus().insertContentAt(
      block.pos + block.node.nodeSize,
      { type: "paragraph" },
      { updateSelection: true },
    ).run();
  };
  return {
    handleDragEnd,
    handleDragStart,
    handleInsert,
    handleInsertMouseDown,
    handleMenuOpenChange,
    handleNodeChange,
    gutterContentRef,
    isActive,
    isMenuOpen,
    menuBlock,
    offsetY,
  };
}

export function BlockGutter({ editor }: { editor: Editor }) {
  const {
    gutterContentRef, handleDragEnd, handleDragStart, handleInsert,
    handleInsertMouseDown, handleMenuOpenChange, handleNodeChange,
    isActive, isMenuOpen, menuBlock, offsetY,
  } = useBlockGutter(editor);
  return (
    <DragHandle
      className={isActive || isMenuOpen
        ? "notes-editor-next__gutter notes-editor-next__gutter--visible"
        : "notes-editor-next__gutter"}
      editor={editor}
      onElementDragEnd={handleDragEnd}
      onElementDragStart={handleDragStart}
      onNodeChange={handleNodeChange}
    >
      <div
        ref={gutterContentRef}
        className="notes-editor-next__gutter-content"
        style={{ transform: `translateY(${offsetY}px)` }}
      >
        <Button
          aria-label="Chèn khối bên dưới"
          className="notes-editor-next__insert-button"
          draggable={false}
          size="icon-sm"
          title="Chèn khối bên dưới"
          variant="ghost"
          onClick={handleInsert}
          onMouseDown={handleInsertMouseDown}
        >
          <Plus aria-hidden="true" />
        </Button>
        <BlockMenu
          block={menuBlock}
          editor={editor}
          open={isMenuOpen}
          onOpenChange={handleMenuOpenChange}
        >
          <GripVertical aria-hidden="true" />
        </BlockMenu>
      </div>
    </DragHandle>
  );
}
