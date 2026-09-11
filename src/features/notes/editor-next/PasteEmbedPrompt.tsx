"use client";

import type { Editor } from "@tiptap/react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button/Button";

import type { EmbedPasteSuggestion } from "./embed-paste";

interface PasteEmbedPromptProps {
  editor: Editor;
  onClose: () => void;
  suggestion: EmbedPasteSuggestion;
}

export function PasteEmbedPrompt({ editor, onClose, suggestion }: PasteEmbedPromptProps) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 5_000);
    return () => window.clearTimeout(timer);
  }, [onClose, suggestion]);

  const keepLink = () => {
    editor.commands.focus();
    onClose();
  };
  const embed = () => {
    editor.chain().focus().insertContentAt(
      { from: suggestion.from, to: suggestion.to },
      {
        type: "embed",
        attrs: {
          aspect: suggestion.resolved.aspect,
          provider: suggestion.resolved.provider.id,
          src: suggestion.resolved.src,
          title: suggestion.resolved.provider.label,
        },
      },
    ).run();
    onClose();
  };

  return (
    <div
      className="absolute z-40 mt-2 flex items-center gap-1 rounded-lg bg-popover p-1 shadow-subtle"
      role="group"
      aria-label="Chọn cách hiển thị liên kết"
      style={{ left: suggestion.left, top: suggestion.top }}
    >
      <Button size="sm" variant="ghost" onClick={embed}>Nhúng</Button>
      <span aria-hidden="true" className="text-muted-foreground">·</span>
      <Button size="sm" variant="ghost" onClick={keepLink}>Giữ link</Button>
    </div>
  );
}
