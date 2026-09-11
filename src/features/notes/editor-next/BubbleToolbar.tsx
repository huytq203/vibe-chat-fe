"use client";

import { isTextSelection } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import { BubbleMenu, type BubbleMenuProps } from "@tiptap/react/menus";
import {
  Baseline,
  Bold,
  Code2,
  Highlighter,
  Italic,
  Link2,
  Strikethrough,
  Underline,
} from "lucide-react";
import { useState, type KeyboardEvent, type ReactNode } from "react";

import { Toggle } from "@/components/ui/toggle/Toggle";

import { ColorPalette } from "./ColorPalette";
import { LinkEditor } from "./LinkEditor";
import { noteTextColor, type NoteColorName } from "./note-colors";

type ToolbarMode = "highlight" | "link" | "text" | null;
type BubbleVisibilityProps = Parameters<NonNullable<BubbleMenuProps["shouldShow"]>>[0];

export function shouldShowBubbleToolbar({ editor, element, from, state, to, view }: BubbleVisibilityProps): boolean {
  const hasFocus = view.hasFocus() || element.contains(document.activeElement);
  const hasText = isTextSelection(state.selection) && Boolean(state.doc.textBetween(from, to));
  return from !== to
    && !state.selection.empty
    && hasText
    && hasFocus
    && editor.isEditable
    && !editor.isActive("codeBlock")
    && editor.view.dom.dataset.blockDragging !== "true";
}

interface FormatButtonProps {
  active: boolean;
  children: ReactNode;
  label: string;
  onChange: () => void;
}

function FormatButton({ active, children, label, onChange }: FormatButtonProps) {
  return (
    <Toggle
      aria-label={label}
      className="size-8 border-transparent p-0 data-[state=on]:bg-accent data-[state=on]:text-foreground"
      pressed={active}
      size="icon"
      title={label}
      variant="ghost"
      onMouseDown={(event) => event.preventDefault()}
      onPressedChange={onChange}
    >
      {children}
    </Toggle>
  );
}

function ToolbarControls({ editor, setMode }: {
  editor: Editor;
  setMode: (mode: ToolbarMode) => void;
}) {
  const linkActive = editor.isActive("link");
  return (
    <div className="flex items-center gap-1 p-1">
      <FormatButton active={editor.isActive("bold")} label="Đậm" onChange={() => editor.chain().focus().toggleBold().run()}><Bold className="size-4" /></FormatButton>
      <FormatButton active={editor.isActive("italic")} label="Nghiêng" onChange={() => editor.chain().focus().toggleItalic().run()}><Italic className="size-4" /></FormatButton>
      <FormatButton active={editor.isActive("underline")} label="Gạch chân" onChange={() => editor.chain().focus().toggleUnderline().run()}><Underline className="size-4" /></FormatButton>
      <FormatButton active={editor.isActive("strike")} label="Gạch ngang" onChange={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="size-4" /></FormatButton>
      <FormatButton active={editor.isActive("code")} label="Mã nội dòng" onChange={() => editor.chain().focus().toggleMark("code").run()}><Code2 className="size-4" /></FormatButton>
      <FormatButton active={linkActive} label="Liên kết" onChange={() => setMode("link")}><Link2 className="size-4" /></FormatButton>
      <FormatButton active={Boolean(editor.getAttributes("textStyle").color)} label="Màu chữ" onChange={() => setMode("text")}><Baseline className="size-4" /></FormatButton>
      <FormatButton active={editor.isActive("highlight")} label="Highlight" onChange={() => setMode("highlight")}><Highlighter className="size-4" /></FormatButton>
    </div>
  );
}

function useToolbarActions(editor: Editor, setMode: (mode: ToolbarMode) => void) {
  const selectTextColor = (color: NoteColorName | null) => {
    const chain = editor.chain().focus();
    if (color) chain.setColor(noteTextColor(color)).run();
    else chain.unsetColor().run();
    setMode(null);
  };
  const selectHighlight = (color: NoteColorName | null) => {
    const chain = editor.chain().focus();
    if (color) chain.setHighlight({ color }).run();
    else chain.unsetHighlight().run();
    setMode(null);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    setMode(null);
  };
  return { handleKeyDown, selectHighlight, selectTextColor };
}

export function BubbleToolbar({ editor }: { editor: Editor }) {
  const [mode, setMode] = useState<ToolbarMode>(null);
  const actions = useToolbarActions(editor, setMode);
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") return;
    if (mode) actions.handleKeyDown(event);
    else editor.commands.blur();
  };

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top", offset: 8 }}
      shouldShow={shouldShowBubbleToolbar}
      className="z-50 rounded-md border border-border bg-popover text-foreground shadow-subtle"
    >
      <div aria-label="Định dạng văn bản" role="toolbar" onKeyDown={handleKeyDown}>
        {mode === "link" ? (
          <LinkEditor
            active={editor.isActive("link")}
            editor={editor}
            initialUrl={String(editor.getAttributes("link").href ?? "")}
            onClose={() => setMode(null)}
          />
        ) : mode === "text" ? (
          <div className="p-1">
            <ColorPalette
              kind="text"
              selected={String(editor.getAttributes("textStyle").color ?? "") || null}
              onSelect={actions.selectTextColor}
            />
          </div>
        ) : mode === "highlight" ? (
          <div className="p-1">
            <ColorPalette
              kind="highlight"
              selected={String(editor.getAttributes("highlight").color ?? "") || null}
              onSelect={actions.selectHighlight}
            />
          </div>
        ) : (
          <ToolbarControls editor={editor} setMode={setMode} />
        )}
      </div>
    </BubbleMenu>
  );
}
