"use client";

import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { MAX_LENGTH } from "./composer-utils";
import type { SerializedMessage } from "@/lib/editor/serializer";
import type { EditorHandle } from "./RichMessageEditor";
import { cn } from "@/lib/utils/cn";

type PlainMessageEditorProps = {
  value: string;
  placeholder: string;
  disabled?: boolean;
  onUpdate: (hasContent: boolean, plaintext: string) => void;
  onEnter: () => void;
  onEscape?: () => void;
  onCommandKeyDown?: (event: globalThis.KeyboardEvent) => boolean;
  onPasteFiles: (files: File[]) => boolean;
  onFocusRequest?: () => void;
};

/** Textarea tự cao theo nội dung; max-height do class quyết định (cuộn khi vượt). */
function fitHeight(textarea: HTMLTextAreaElement) {
  textarea.style.height = "0px";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

export const PlainMessageEditor = forwardRef<
  EditorHandle,
  PlainMessageEditorProps
>(function PlainMessageEditor(
  {
    value,
    placeholder,
    disabled,
    onUpdate,
    onEnter,
    onEscape,
    onCommandKeyDown,
    onPasteFiles,
    onFocusRequest,
  },
  ref,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const valueRef = useRef(value);
  const structuredValueRef = useRef<SerializedMessage | null>(null);
  valueRef.current = value;

  const updateValue = (next: string, structured?: SerializedMessage) => {
    const textarea = textareaRef.current;
    if (next.length > MAX_LENGTH) {
      if (textarea) textarea.value = valueRef.current;
      return false;
    }
    valueRef.current = next;
    structuredValueRef.current = structured?.plaintext === next ? structured : null;
    if (textarea) {
      if (textarea.value !== next) textarea.value = next;
      fitHeight(textarea);
    }
    onUpdate(next.trim().length > 0, next);
    return true;
  };

  useImperativeHandle(ref, () => ({
    editor: null,
    isFocused: () => document.activeElement === textareaRef.current,
    serialize: () => {
      const plaintext = textareaRef.current?.value ?? valueRef.current;
      if (structuredValueRef.current?.plaintext === plaintext) {
        return structuredValueRef.current;
      }
      return { plaintext, mentions: [], richText: null };
    },
    clear: () => updateValue(""),
    focus: () => textareaRef.current?.focus(),
    insertText: (text: string) => {
      const textarea = textareaRef.current;
      const shouldRestoreFocus = document.activeElement === textarea;
      const current = textarea?.value ?? valueRef.current;
      const start = textarea?.selectionStart ?? current.length;
      const end = textarea?.selectionEnd ?? start;
      const next = `${current.slice(0, start)}${text}${current.slice(end)}`;
      if (!updateValue(next)) return;
      requestAnimationFrame(() => {
        const activeTextarea = textareaRef.current;
        if (!activeTextarea) return;
        const caret = start + text.length;
        activeTextarea.setSelectionRange(caret, caret);
        if (shouldRestoreFocus) activeTextarea.focus();
      });
    },
    setPlainText: updateValue,
    setSerialized: (message: SerializedMessage) => {
      updateValue(message.plaintext, message);
    },
  }));

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    if (textarea.value !== value) textarea.value = value;
    fitHeight(textarea);
  }, [value]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (onCommandKeyDown?.(event.nativeEvent)) {
      event.preventDefault();
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onEnter();
    } else if (event.key === "Escape" && onEscape) {
      event.preventDefault();
      onEscape();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.files).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (files.length > 0 && onPasteFiles(files)) event.preventDefault();
  };

  const handleInput = (event: FormEvent<HTMLTextAreaElement>) => {
    updateValue(event.currentTarget.value);
  };

  return (
    <textarea
      ref={textareaRef}
      rows={1}
      defaultValue={value}
      placeholder={placeholder}
      disabled={disabled}
      aria-label="Nhập tin nhắn"
      enterKeyHint="send"
      autoComplete="off"
      autoCapitalize="sentences"
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onFocus={onFocusRequest}
      className={cn(
        "block min-w-0 flex-1 resize-none overflow-y-auto rounded-none border-0 bg-transparent",
        // Mobile: 1 dòng = 44px, khớp nút 44px và tránh iOS zoom (font ≥ 16px).
        "max-h-[7.5rem] px-2 py-2.5 text-base leading-6",
        // Desktop: 1 dòng = 32px, khớp nút icon-sm.
        "md:max-h-32 md:px-1.5 md:py-1.5 md:text-[13.5px] md:leading-5",
        "text-foreground caret-foreground placeholder:text-muted-foreground",
        "outline-none focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
    />
  );
});
