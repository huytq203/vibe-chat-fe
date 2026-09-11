"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import type { SuggestionOptions } from "@tiptap/suggestion";
import { splitBlock } from "@tiptap/pm/commands";
import { baseEditorExtensions } from "@/lib/editor/extensions";
import { createMentionExtension } from "@/lib/editor/mention-extension";
import {
  jsonToMessage,
  messageToJson,
  type SerializedMessage,
} from "@/lib/editor/serializer";
import { MAX_LENGTH } from "@/features/chat/components/messages/composer-utils";
import { cn } from "@/lib/utils/cn";

/**
 * Nội dung copy từ web thường mang theo màu chữ/nền của trang nguồn.
 * Loại bỏ các thuộc tính phụ thuộc theme để text luôn đọc được trong composer,
 * nhưng vẫn giữ cấu trúc và định dạng có nghĩa như bold/italic/link.
 */
export function sanitizePastedHtml(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;

  template.content.querySelectorAll<HTMLElement>("*").forEach((element) => {
    element.removeAttribute("class");
    element.removeAttribute("color");
    element.removeAttribute("bgcolor");

    element.style.removeProperty("color");
    element.style.removeProperty("background");
    element.style.removeProperty("background-color");
    element.style.removeProperty("-webkit-text-fill-color");

    if (!element.getAttribute("style")?.trim()) {
      element.removeAttribute("style");
    }
  });

  return template.innerHTML;
}

const EMPTY: SerializedMessage = {
  plaintext: "",
  mentions: [],
  richText: null,
};

export type EditorHandle = {
  editor: Editor | null;
  isFocused: () => boolean;
  serialize: () => SerializedMessage;
  clear: () => void;
  focus: () => void;
  insertText: (text: string) => void;
  setPlainText: (text: string) => void;
  setSerialized: (message: SerializedMessage) => void;
};

type RichMessageEditorProps = {
  placeholder: string;
  initialValue?: SerializedMessage;
  focusOnMount?: boolean;
  disabled?: boolean;
  /** Mở rộng vùng soạn (cao hơn, thoáng) — toggle từ toolbar. */
  expanded?: boolean;
  mentionSuggestion: Omit<SuggestionOptions, "editor">;
  isMentionOpen: () => boolean;
  onUpdate: (hasContent: boolean, plaintext: string) => void;
  onEnter: () => void;
  onEscape?: () => void;
  onCommandKeyDown?: (event: KeyboardEvent) => boolean;
  onPasteFiles: (files: File[]) => boolean;
  /** Phát instance editor lên cha (toolbar cần reactive, ref không đủ). */
  onEditor?: (editor: Editor | null) => void;
  onFocusRequest?: () => void;
};

export const RichMessageEditor = forwardRef<
  EditorHandle,
  RichMessageEditorProps
>(function RichMessageEditor(
  {
    placeholder,
    initialValue,
    focusOnMount,
    disabled,
    expanded,
    mentionSuggestion,
    isMentionOpen,
    onUpdate,
    onEnter,
    onEscape,
    onCommandKeyDown,
    onPasteFiles,
    onEditor,
    onFocusRequest,
  },
  ref,
) {
  const revealTimerRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  const revealAboveKeyboard = (ed: Editor) => {
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    if (revealTimerRef.current !== null) {
      window.clearTimeout(revealTimerRef.current);
    }
    // Lần đầu giữ phản hồi chạm tức thì; lần sau chạy khi animation keyboard iOS
    // đã kết thúc. Chỉ chạy lúc focus, không chạy theo input/visualViewport.
    ed.view.dom.scrollIntoView({ block: "end", inline: "nearest" });
    revealTimerRef.current = window.setTimeout(() => {
      revealTimerRef.current = null;
      if (ed.isFocused) {
        ed.view.dom.scrollIntoView({ block: "end", inline: "nearest" });
      }
    }, 280);
  };

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      ...baseEditorExtensions(placeholder),
      createMentionExtension(mentionSuggestion),
    ],
    editorProps: {
      transformPastedHTML: sanitizePastedHtml,
      attributes: {
        // Chiều cao/scroll do wrapper EditorContent điều khiển (động theo expanded).
        class: cn(
          "min-h-[32px] px-1.5 py-[5px] text-[13.5px] leading-relaxed text-foreground caret-foreground outline-none",
          disabled && "cursor-not-allowed opacity-50",
        ),
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Nhập tin nhắn",
      },
      handleKeyDown: (view, event) => {
        if (onCommandKeyDown?.(event)) {
          event.preventDefault();
          return true;
        }
        if (event.key === "Enter" && !event.shiftKey) {
          // Mention popup đang mở → nhường Enter cho plugin chọn mention.
          if (isMentionOpen()) return false;
          event.preventDefault();
          onEnter();
          return true;
        }
        // Shift+Enter → tách paragraph mới (serializer xuất '\n' theo paragraph).
        if (event.key === "Enter" && event.shiftKey) {
          event.preventDefault();
          return splitBlock(view.state, view.dispatch);
        }
        if (event.key === "Escape" && onEscape && !isMentionOpen()) {
          event.preventDefault();
          onEscape();
          return true;
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) =>
          f.type.startsWith("image/"),
        );
        return files.length > 0 ? onPasteFiles(files) : false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      const { plaintext } = jsonToMessage(ed.getJSON());
      if (plaintext.length > MAX_LENGTH) {
        ed.commands.undo();
        return;
      }
      onUpdate(plaintext.trim().length > 0, plaintext);
    },
    onFocus: ({ editor: focusedEditor }) => {
      onFocusRequest?.();
      revealAboveKeyboard(focusedEditor);
    },
  });

  useImperativeHandle(
    ref,
    () => ({
      editor,
      isFocused: () => Boolean(editor?.isFocused),
      serialize: () => (editor ? jsonToMessage(editor.getJSON()) : EMPTY),
      clear: () => editor?.commands.clearContent(true),
      focus: () => editor?.commands.focus("end"),
      insertText: (text: string) => editor?.commands.insertContent(text),
      setPlainText: (text: string) =>
        editor?.commands.setContent({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: text ? [{ type: "text", text }] : [],
            },
          ],
        }),
      setSerialized: (message: SerializedMessage) => {
        if (!editor) return;
        const richText = message.richText ?? { v: 1 as const, marks: [], blocks: [] };
        editor.commands.setContent(messageToJson(message.plaintext, message.mentions, richText));
      },
    }),
    [editor],
  );

  useEffect(() => {
    onEditor?.(editor);
    return () => onEditor?.(null);
  }, [editor, onEditor]);

  useEffect(() => {
    if (!editor || initializedRef.current) return;
    initializedRef.current = true;
    if (initialValue) {
      const richText = initialValue.richText ?? { v: 1 as const, marks: [], blocks: [] };
      editor.commands.setContent(
        messageToJson(initialValue.plaintext, initialValue.mentions, richText),
      );
    }
    if (focusOnMount) editor.commands.focus("end");
  }, [editor, focusOnMount, initialValue]);

  useEffect(() => () => {
    if (revealTimerRef.current !== null) {
      window.clearTimeout(revealTimerRef.current);
    }
  }, []);

  return (
    <EditorContent
      editor={editor}
      onPointerDown={() => {
        // iOS chỉ mở bàn phím tin cậy khi focus xảy ra ngay trong touch gesture.
        // Không preventDefault để WebKit vẫn đặt caret đúng vị trí người dùng chạm.
        if (editor && !editor.isFocused && !disabled) editor.view.focus();
      }}
      onClick={() => {
        // Fallback cho trình duyệt không phát pointer event.
        if (editor && !editor.isFocused && !disabled) editor.view.focus();
      }}
      className={cn(
        "flex-1 overflow-y-auto transition-[max-height] duration-200",
        expanded ? "min-h-[240px] max-h-[55vh]" : "min-h-[32px] max-h-32",
      )}
    />
  );
});
