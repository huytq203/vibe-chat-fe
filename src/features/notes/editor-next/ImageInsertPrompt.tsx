"use client";

import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button/Button";
import { Input } from "@/components/ui/input/Input";
import { sanitizeLinkUrl } from "@/lib/editor/rich-presets";

import type { UploadFile } from "./attachment-upload";

interface ImageInsertPromptProps {
  onApply: (url: string) => void;
  onClose: () => void;
  uploadFile?: UploadFile;
}

export function ImageInsertPrompt({ onApply, onClose, uploadFile }: ImageInsertPromptProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [invalid, setInvalid] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState("");
  const applyUrl = () => {
    const safeUrl = sanitizeLinkUrl(url);
    if (!safeUrl || !/^https?:/i.test(safeUrl)) {
      setInvalid(true);
      return;
    }
    onApply(safeUrl);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyUrl();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
  };
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uploadFile) return;
    setUploading(true);
    try {
      onApply(await uploadFile(file));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Không thể tải ảnh lên. Vui lòng thử lại.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2 p-2" role="group" aria-label="Chèn ảnh">
      <div className="flex items-center gap-1">
        <Input
          aria-invalid={invalid}
          aria-label="URL ảnh"
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
        <Button disabled={uploading} size="sm" variant="ghost" onClick={applyUrl}>Chèn</Button>
        <Button disabled={uploading} size="sm" variant="ghost" onClick={onClose}>Huỷ</Button>
      </div>
      <input
        ref={inputRef}
        accept="image/*"
        aria-label="Chọn ảnh từ máy"
        className="sr-only"
        disabled={!uploadFile || uploading}
        type="file"
        onChange={(event) => void handleFileChange(event)}
      />
      <Button
        className="self-start"
        disabled={!uploadFile || uploading}
        size="sm"
        variant="ghost"
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "Đang tải ảnh…" : "Tải lên từ máy"}
      </Button>
    </div>
  );
}
