import { useRef } from "react";
import type { Editor } from "@tiptap/react";

export interface EmbeddedImage {
  attachmentId: string;
  src: string;
  alt: string;
}

/** Upload ảnh (paste hoặc chọn tệp) rồi chèn vào editor mô tả task dạng node ảnh. */
export function useDescriptionImageUpload(
  editor: Editor | null,
  onPasteImage?: (file: File) => Promise<EmbeddedImage>,
) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const insertImage = (file: File): void => {
    if (!onPasteImage) return;
    void onPasteImage(file)
      .then((uploaded) => {
        editor
          ?.chain()
          .focus()
          .insertContent({
            type: "image",
            attrs: {
              src: uploaded.src,
              alt: uploaded.alt,
              attachmentId: uploaded.attachmentId,
            },
          })
          .run();
      })
      .catch(() => undefined);
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) insertImage(file);
  };

  const openFilePicker = (): void => fileInputRef.current?.click();

  return { fileInputRef, insertImage, handleFileInputChange, openFilePicker };
}
