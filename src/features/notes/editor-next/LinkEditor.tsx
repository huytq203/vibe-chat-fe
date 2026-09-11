"use client";

import type { Editor } from "@tiptap/react";
import { Check, Link2Off, X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button/Button";
import { Input } from "@/components/ui/input/Input";
import { sanitizeLinkUrl } from "@/lib/editor/rich-presets";

interface LinkEditorProps {
  active: boolean;
  editor: Editor;
  initialUrl: string;
  onApply?: (href: string) => void;
  onClose: () => void;
}

function useLinkEditor(
  editor: Editor,
  initialUrl: string,
  onApply: ((href: string) => void) | undefined,
  onClose: () => void,
) {
  const [invalid, setInvalid] = useState(false);
  const [url, setUrl] = useState(initialUrl);
  const apply = () => {
    const href = sanitizeLinkUrl(url);
    if (!href) {
      setInvalid(true);
      return;
    }
    if (onApply) {
      onApply(href);
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    onClose();
  };
  const remove = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    onClose();
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
  const changeUrl = (value: string) => {
    setInvalid(false);
    setUrl(value);
  };
  return { apply, changeUrl, handleKeyDown, invalid, remove, url };
}

export function LinkEditor({ active, editor, initialUrl, onApply, onClose }: LinkEditorProps) {
  const link = useLinkEditor(editor, initialUrl, onApply, onClose);

  return (
    <div className="flex items-center gap-1 p-1" role="group" aria-label="Chỉnh sửa liên kết">
      <Input
        aria-invalid={link.invalid}
        aria-label="URL liên kết"
        autoFocus
        className="h-8 w-56 rounded-md bg-background px-2"
        placeholder="https://..."
        value={link.url}
        onChange={(event) => link.changeUrl(event.target.value)}
        onKeyDown={link.handleKeyDown}
      />
      <Button aria-label="Áp dụng liên kết" size="icon-sm" variant="ghost" onClick={link.apply}>
        <Check aria-hidden="true" className="size-4" />
      </Button>
      {active ? (
        <Button aria-label="Gỡ liên kết" size="icon-sm" variant="ghost" onClick={link.remove}>
          <Link2Off aria-hidden="true" className="size-4" />
        </Button>
      ) : null}
      <Button aria-label="Huỷ sửa liên kết" size="icon-sm" variant="ghost" onClick={onClose}>
        <X aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
}
