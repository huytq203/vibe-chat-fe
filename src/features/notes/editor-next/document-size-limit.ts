import { Extension } from "@tiptap/core";
import { isChangeOrigin } from "@tiptap/extension-collaboration";
import { Plugin } from "@tiptap/pm/state";
import { toast } from "sonner";
import type { Doc as YDoc } from "yjs";

import {
  DOCUMENT_LIMIT_BYTES,
  DOCUMENT_WARNING_BYTES,
} from "@/features/notes/constants";
import { collabDocumentUpdateBytes } from "@/lib/collab";

const DOCUMENT_MEASURE_DELAY_MS = 3_000;
const BLOCKED_TOAST_INTERVAL_MS = 2_000;

interface DocumentSizeLimitOptions {
  doc: YDoc | null;
}

/** Chặn tăng nội dung cục bộ sau 5 MB, nhưng vẫn cho phép xoá và nhận cập nhật từ xa. */
export const DocumentSizeLimit = Extension.create<DocumentSizeLimitOptions>({
  name: "documentSizeLimit",
  addOptions: () => ({ doc: null }),
  addProseMirrorPlugins() {
    const doc = this.options.doc;
    if (!doc) return [];
    let currentBytes = collabDocumentUpdateBytes(doc);
    let warned = false;
    let lastBlockedToastAt = Number.NEGATIVE_INFINITY;

    const measure = () => {
      currentBytes = collabDocumentUpdateBytes(doc);
      if (currentBytes <= DOCUMENT_WARNING_BYTES || warned) return;
      warned = true;
      toast.warning("Tài liệu đã vượt 3 MB. Hãy rút gọn để tránh giới hạn 5 MB.");
    };

    return [new Plugin({
      filterTransaction(transaction, state) {
        const addsContent = transaction.docChanged
          && transaction.doc.content.size > state.doc.content.size;
        if (!addsContent || isChangeOrigin(transaction) || currentBytes <= DOCUMENT_LIMIT_BYTES) {
          return true;
        }
        if (Date.now() - lastBlockedToastAt > BLOCKED_TOAST_INTERVAL_MS) {
          lastBlockedToastAt = Date.now();
          toast.error("Không thể thêm nội dung vì tài liệu đã vượt giới hạn 5 MB.");
        }
        return false;
      },
      view() {
        let timer: ReturnType<typeof setTimeout> | null = null;
        const scheduleMeasure = () => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(measure, DOCUMENT_MEASURE_DELAY_MS);
        };
        measure();
        doc.on("update", scheduleMeasure);
        return { destroy: () => {
          if (timer) clearTimeout(timer);
          doc.off("update", scheduleMeasure);
        } };
      },
    })];
  },
});
