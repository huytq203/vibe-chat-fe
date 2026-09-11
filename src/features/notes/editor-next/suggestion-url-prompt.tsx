"use client";

import type { Editor, Range } from "@tiptap/core";
import { useState, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button/Button";
import { Input } from "@/components/ui/input/Input";
import { resolveEmbed } from "@/lib/editor/embed-providers";

import { ImageInsertPrompt } from "./ImageInsertPrompt";
import { LinkEditor } from "./LinkEditor";
import { slashCommandStorage } from "./slash-command-storage";
import type { SuggestionItem } from "./suggestion-popup";

interface EmbedUrlEditorProps {
  item: SuggestionItem;
  onApply: (url: string) => void;
  onClose: () => void;
}

function EmbedUrlEditor({ item, onApply, onClose }: EmbedUrlEditorProps) {
  const [invalid, setInvalid] = useState(false);
  const [url, setUrl] = useState("");
  const apply = () => {
    const resolved = resolveEmbed(url.trim());
    if (!resolved || (item.embedProviderId && resolved.provider.id !== item.embedProviderId)) {
      setInvalid(true);
      return;
    }
    onApply(url.trim());
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      apply();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
  };
  return (
    <div className="p-1" role="group" aria-label="Nhúng nội dung theo URL">
      <div className="flex items-center gap-1">
        <Input
          aria-invalid={invalid}
          aria-label="URL nội dung nhúng"
          autoFocus
          className="h-8 w-64 rounded-md bg-background px-2"
          placeholder="https://..."
          value={url}
          onChange={(event) => {
            setInvalid(false);
            setUrl(event.target.value);
          }}
          onKeyDown={handleKeyDown}
        />
        <Button size="sm" variant="ghost" onClick={apply}>Nhúng</Button>
        <Button size="sm" variant="ghost" onClick={onClose}>Huỷ</Button>
      </div>
      {invalid ? (
        <p className="px-2 pb-1 pt-1 text-xs text-danger" role="alert">
          URL không thuộc dịch vụ hỗ trợ
        </p>
      ) : null}
    </div>
  );
}

interface SuggestionUrlPromptProps {
  command: (item: SuggestionItem) => void;
  editor?: Editor;
  item: SuggestionItem;
  onClose: () => void;
  range?: Range;
}

export function SuggestionUrlPrompt({
  command,
  editor,
  item,
  onClose,
  range,
}: SuggestionUrlPromptProps) {
  if (!editor || !range) return null;
  const apply = (value: string) => command({
    ...item,
    run: (targetEditor: Editor, targetRange: Range) => {
      item.run(targetEditor, targetRange, value);
    },
  });
  return (
    <div className="rounded-[10px] border border-border bg-popover shadow-subtle">
      {item.prompt === "link" ? (
        <LinkEditor
          active={false}
          editor={editor}
          initialUrl=""
          onApply={apply}
          onClose={onClose}
        />
      ) : item.prompt === "embed" ? (
        <EmbedUrlEditor item={item} onApply={apply} onClose={onClose} />
      ) : (
        <ImageInsertPrompt
          onApply={apply}
          onClose={onClose}
          uploadFile={slashCommandStorage(editor)?.uploadFile ?? undefined}
        />
      )}
    </div>
  );
}
