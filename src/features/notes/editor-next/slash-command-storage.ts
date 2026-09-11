import type { Editor, Range } from "@tiptap/core";

import type { UploadFile } from "./attachment-upload";

/** Khe cầu nối để menu `/` gọi các overlay và dịch vụ thuộc editor React. */
export interface SlashCommandStorage {
  openTableGrid: ((range: Range) => void) | null;
  uploadFile: UploadFile | null;
}

export function slashCommandStorage(editor: Editor): SlashCommandStorage | undefined {
  return (editor.storage as unknown as Record<string, SlashCommandStorage | undefined>)
    .slashCommand;
}
