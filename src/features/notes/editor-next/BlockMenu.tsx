"use client";

import type { ChainedCommands } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import type { Node } from "@tiptap/pm/model";
import {
  Code2,
  CopyPlus,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Palette,
  Quote,
  Sparkles,
  Text,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu/DropdownMenu";
import { useNotesUiStore } from "@/features/notes/stores/notes-ui.store";

import { ColorPalette } from "./ColorPalette";
import { noteTextColor, type NoteColorName } from "./note-colors";

export interface ActiveBlock {
  node: Node;
  pos: number;
}

interface BlockMenuProps {
  block: ActiveBlock | null;
  children: ReactNode;
  editor: Editor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type BlockType = "bulletList" | "codeBlock" | "heading1" | "heading2" |
  "heading3" | "orderedList" | "paragraph" | "blockquote";

const BLOCK_TYPES: ReadonlyArray<{ icon: ReactNode; label: string; type: BlockType }> = [
  { type: "paragraph", label: "Văn bản", icon: <Text /> },
  { type: "heading1", label: "Tiêu đề 1", icon: <Heading1 /> },
  { type: "heading2", label: "Tiêu đề 2", icon: <Heading2 /> },
  { type: "heading3", label: "Tiêu đề 3", icon: <Heading3 /> },
  { type: "bulletList", label: "Danh sách gạch đầu dòng", icon: <List /> },
  { type: "orderedList", label: "Danh sách số", icon: <ListOrdered /> },
  { type: "blockquote", label: "Trích dẫn", icon: <Quote /> },
  { type: "codeBlock", label: "Code", icon: <Code2 /> },
];

function selectBlock(editor: Editor, block: ActiveBlock) {
  const from = block.pos + 1;
  const to = block.pos + block.node.nodeSize - 1;
  return editor.chain().focus().setTextSelection({ from, to });
}

function changeBlockType(editor: Editor, block: ActiveBlock, type: BlockType): void {
  const chain = selectBlock(editor, block).clearNodes();
  if (type === "paragraph") chain.setParagraph().run();
  else if (type === "heading1") chain.setHeading({ level: 1 }).run();
  else if (type === "heading2") chain.setHeading({ level: 2 }).run();
  else if (type === "heading3") chain.setHeading({ level: 3 }).run();
  else if (type === "bulletList") chain.toggleBulletList().run();
  else if (type === "orderedList") chain.toggleOrderedList().run();
  else if (type === "blockquote") chain.toggleBlockquote().run();
  else chain.setCodeBlock().run();
}

type BlockColorKind = "highlight" | "text";

function setBlockMark(
  chain: ChainedCommands,
  color: NoteColorName | null,
  kind: BlockColorKind,
): ChainedCommands {
  if (kind === "text") {
    return color ? chain.setColor(noteTextColor(color)) : chain.unsetColor();
  }
  return color ? chain.setHighlight({ color }) : chain.unsetHighlight();
}

function applyBlockColor(
  editor: Editor,
  block: ActiveBlock,
  color: NoteColorName | null,
  kind: BlockColorKind,
): void {
  const from = block.pos + 1;
  const to = block.pos + block.node.nodeSize - 1;
  let chain = editor.chain().focus();
  if (block.node.content.size > 0) {
    chain = setBlockMark(chain.setTextSelection({ from, to }), color, kind);
  }
  setBlockMark(chain.setTextSelection(to), color, kind).run();
}

function BlockColorMenu({ block, editor }: { block: ActiveBlock | null; editor: Editor }) {
  const select = (kind: BlockColorKind) => (color: NoteColorName | null) => {
    if (block) applyBlockColor(editor, block, color, kind);
  };
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Palette className="text-muted-foreground" />
        Màu
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-80 rounded-md border-border bg-popover text-foreground">
        <DropdownMenuLabel className="pb-1 text-xs text-muted-foreground">Màu chữ</DropdownMenuLabel>
        <ColorPalette kind="text" selected={null} onSelect={select("text")} />
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="pb-1 text-xs text-muted-foreground">Màu nền</DropdownMenuLabel>
        <ColorPalette kind="highlight" label="Màu nền" selected={null} onSelect={select("highlight")} />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

export function deleteBlock(editor: Editor, block: ActiveBlock): void {
  editor.chain().focus().deleteRange({
    from: block.pos,
    to: block.pos + block.node.nodeSize,
  }).run();
}

export function duplicateBlock(editor: Editor, block: ActiveBlock): void {
  editor.chain().focus().insertContentAt(
    block.pos + block.node.nodeSize,
    block.node.toJSON(),
  ).run();
}

/** Tìm khối cấp cao nhất chứa con trỏ để các bề mặt lệnh dùng chung thao tác khối. */
export function activeBlockAt(editor: Editor, position: number): ActiveBlock | null {
  const safePosition = Math.min(position, editor.state.doc.content.size);
  const resolved = editor.state.doc.resolve(safePosition);
  if (resolved.depth < 1) return null;
  return { node: resolved.node(1), pos: resolved.before(1) };
}

export function BlockMenu({ block, children, editor, open, onOpenChange }: BlockMenuProps) {
  const setAiComposerDraft = useNotesUiStore((state) => state.setAiComposerDraft);
  const setSidePanelTab = useNotesUiStore((state) => state.setSidePanelTab);
  const setSidePanelOpen = useNotesUiStore((state) => state.setSidePanelOpen);
  const askAi = () => {
    if (!block) return;
    setAiComposerDraft(`> ${block.node.textContent.slice(0, 500)}\n\n`);
    setSidePanelTab("ai");
    setSidePanelOpen(true);
  };
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger render={
        <Button
          aria-label="Mở menu khối hoặc kéo để di chuyển"
          className="notes-editor-next__drag-button"
          size="icon-sm"
          title="Mở menu khối hoặc kéo để di chuyển"
          variant="ghost"
        >
          {children}
        </Button>
      } />
      <DropdownMenuContent
        align="start"
        className="w-56 rounded-md border-border bg-popover text-foreground"
        side="right"
        sideOffset={6}
      >
        <DropdownMenuItem onClick={() => block && duplicateBlock(editor, block)}>
          <CopyPlus className="text-muted-foreground" />
          Nhân đôi khối
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Text className="text-muted-foreground" />
            Đổi thành
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-60 rounded-md border-border bg-popover text-foreground">
            {BLOCK_TYPES.map((item) => (
              <DropdownMenuItem
                key={item.type}
                onClick={() => block && changeBlockType(editor, block, item.type)}
              >
                <span className="text-muted-foreground">{item.icon}</span>
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <BlockColorMenu block={block} editor={editor} />
        <DropdownMenuItem onClick={askAi}>
          <Sparkles className="text-muted-foreground" />
          Hỏi AI
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-danger focus:text-danger"
          onClick={() => block && deleteBlock(editor, block)}
        >
          <Trash2 />
          Xoá khối
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
