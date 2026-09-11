"use client";

import { NodeViewContent, NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { useCallback, useEffect, useState, type ChangeEvent } from "react";

import {
  CODE_BLOCK_LANGUAGES,
  resolveCodeLanguage,
  type CodeBlockLanguage,
} from "@/features/notes/lib/code-highlighting";

type CopyState = "copied" | "error" | "idle";

const COPY_LABEL: Record<CopyState, string> = {
  copied: "Đã chép",
  error: "Thử lại",
  idle: "Sao chép",
};

type CodeBlockViewProps = Pick<
  ReactNodeViewProps,
  "editor" | "node" | "updateAttributes"
>;

/** Thanh công cụ và vùng nhập trực tiếp cho code block Tiptap. */
export function CodeBlockView({ editor, node, updateAttributes }: CodeBlockViewProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const language = resolveCodeLanguage(
    typeof node.attrs.language === "string" ? node.attrs.language : undefined,
  );

  useEffect(() => {
    if (copyState === "idle") return;
    const timer = window.setTimeout(() => setCopyState("idle"), 1_500);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  const handleLanguageChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      updateAttributes({ language: resolveCodeLanguage(event.target.value) });
    },
    [updateAttributes],
  );
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(node.textContent);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }, [node.textContent]);

  return (
    <NodeViewWrapper className="notes-editor-next__code-block shiki">
      <div className="notes-editor-next__code-toolbar" contentEditable={false}>
        {editor.isEditable ? (
          <select
            aria-label="Ngôn ngữ đoạn mã"
            onChange={handleLanguageChange}
            value={language}
          >
            {(Object.entries(CODE_BLOCK_LANGUAGES) as Array<
              [CodeBlockLanguage, (typeof CODE_BLOCK_LANGUAGES)[CodeBlockLanguage]]
            >).map(([id, item]) => (
              <option key={id} value={id}>{item.name}</option>
            ))}
          </select>
        ) : (
          <span className="notes-editor-next__code-language">
            {CODE_BLOCK_LANGUAGES[language].name}
          </span>
        )}
        <button
          aria-label={copyState === "copied" ? "Đã sao chép đoạn mã" : "Sao chép đoạn mã"}
          data-state={copyState}
          onClick={handleCopy}
          type="button"
        >
          {COPY_LABEL[copyState]}
        </button>
      </div>
      <pre><NodeViewContent<"code"> as="code" /></pre>
    </NodeViewWrapper>
  );
}
