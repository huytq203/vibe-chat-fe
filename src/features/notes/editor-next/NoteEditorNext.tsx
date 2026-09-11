"use client";

import { type Editor, EditorContent, useEditor } from "@tiptap/react";
import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import type { Doc as YDoc } from "yjs";

import { NoteTitle } from "@/features/notes/components/editor/NoteTitle";
import { useFileUpload } from "@/features/notes/hooks/useFileUpload";
import type { PageDetail } from "@/features/notes/types";
import {
  markLocalCollabCursorMoved,
  startCollabCursorLabels,
  type CollabProvider,
} from "@/lib/collab";
import { extractTiptapOutline, type OutlineItem } from "@/lib/editor/heading-outline";

import { BlockGutter } from "./BlockGutter";
import {
  AttachmentUploadPlaceholder,
  handleFileDrop,
  handleFilePaste,
} from "./attachment-upload";
import { BubbleToolbar } from "./BubbleToolbar";
import { DocumentSizeLimit } from "./document-size-limit";
import { handleEmbedPaste, type EmbedPasteSuggestion } from "./embed-paste";
import { createCollaborativeNoteEditorExtensions } from "./extensions";
import { PasteEmbedPrompt } from "./PasteEmbedPrompt";
import { SlashCommand } from "./slash-command";

const CURSOR_MOVEMENT_KEYS = new Set([
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "End",
  "Home",
  "PageDown",
  "PageUp",
]);

interface NoteEditorNextProps {
  doc: YDoc;
  onOutlineChange?: (items: OutlineItem[]) => void;
  page: Pick<PageDetail, "id" | "myRole" | "parentId" | "workspaceId">;
  provider: CollabProvider;
}

function useCursorActivity(provider: CollabProvider) {
  useEffect(() => startCollabCursorLabels(provider), [provider]);
  const markCursorMoved = useCallback(() => {
    markLocalCollabCursorMoved(provider);
  }, [provider]);
  const handleCursorKey = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (CURSOR_MOVEMENT_KEYS.has(event.key)) markLocalCollabCursorMoved(provider);
    },
    [provider],
  );
  return { handleCursorKey, markCursorMoved };
}

function useTiptapOutline(
  editor: Editor | null,
  onOutlineChange?: (items: OutlineItem[]) => void,
): void {
  useEffect(() => {
    if (!editor || !onOutlineChange) return;
    const publishOutline = () => onOutlineChange(extractTiptapOutline(editor.getJSON()));
    publishOutline();
    editor.on("update", publishOutline);
    return () => {
      editor.off("update", publishOutline);
      onOutlineChange([]);
    };
  }, [editor, onOutlineChange]);
}

/** Editor Tiptap cộng tác chạy song song, chưa được nối vào luồng ghi chú hiện tại. */
export function NoteEditorNext({ doc, onOutlineChange, page, provider }: NoteEditorNextProps) {
  const editable = page.myRole !== "VIEW" && page.myRole !== "COMMENT";
  const uploadFile = useFileUpload(page.id);
  const [pasteSuggestion, setPasteSuggestion] = useState<EmbedPasteSuggestion | null>(null);
  const closePasteSuggestion = useCallback(() => setPasteSuggestion(null), []);
  const editor = useEditor(
    {
      editable,
      immediatelyRender: false,
      extensions: [
        ...createCollaborativeNoteEditorExtensions({ doc, provider }),
        AttachmentUploadPlaceholder,
        DocumentSizeLimit.configure({ doc }),
        SlashCommand.configure({ uploadFile }),
      ],
      editorProps: {
        attributes: {
          class: "focus:outline-none",
        },
        handlePaste: (view, event) => {
          closePasteSuggestion();
          if (handleFilePaste(view, event, uploadFile)) return true;
          return handleEmbedPaste(view, event, setPasteSuggestion);
        },
        handleDrop: (view, event) => handleFileDrop(view, event, uploadFile),
        handleTextInput: () => {
          closePasteSuggestion();
          return false;
        },
      },
    },
    [doc, editable, provider, uploadFile],
  );
  const { handleCursorKey, markCursorMoved } = useCursorActivity(provider);
  useTiptapOutline(editor, onOutlineChange);

  if (!editor) return null;

  return (
    <div className="notes-editor notes-editor-next">
      <div className="notes-editor-next__title">
        <NoteTitle
          doc={doc}
          editable={editable}
          onMoveToBody={() => editor.commands.focus("start")}
          page={page}
        />
      </div>
      <div
        className="notes-editor-next__body"
        onKeyUp={handleCursorKey}
        onPointerUp={markCursorMoved}
      >
        <BlockGutter editor={editor} />
        {editable ? <BubbleToolbar editor={editor} /> : null}
        <EditorContent editor={editor} />
        {pasteSuggestion ? (
          <PasteEmbedPrompt
            editor={editor}
            onClose={closePasteSuggestion}
            suggestion={pasteSuggestion}
          />
        ) : null}
      </div>
    </div>
  );
}
