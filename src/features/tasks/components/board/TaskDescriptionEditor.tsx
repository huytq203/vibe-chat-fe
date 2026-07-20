"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BulletList, ListItem, OrderedList } from "@tiptap/extension-list";
import Image from "@tiptap/extension-image";
import { baseEditorExtensions } from "@/lib/editor/extensions";
import { cn } from "@/lib/utils/cn";
import { ImageLightbox } from "@/components/common/ImageLightbox";
import { DescriptionToolbar } from "./DescriptionToolbar";

const TaskImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      attachmentId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-attachment-id"),
        renderHTML: (attributes) =>
          attributes.attachmentId
            ? { "data-attachment-id": String(attributes.attachmentId) }
            : {},
      },
    };
  },
});

interface EmbeddedImage {
  attachmentId: string;
  src: string;
  alt: string;
}

interface TaskDescriptionEditorProps {
  value: string;
  onSave: (html: string) => void;
  onChange?: (html: string) => void;
  onPasteImage?: (file: File) => Promise<EmbeddedImage>;
  imageUrls?: Record<string, string>;
  placeholder?: string;
}

function normalize(html: string): string {
  return html === "<p></p>" ? "" : html;
}

export function TaskDescriptionEditor({
  value,
  onSave,
  onChange,
  onPasteImage,
  imageUrls = {},
  placeholder = "Nhấn để thêm mô tả…",
}: TaskDescriptionEditorProps) {
  const [editing, setEditing] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxSlides, setLightboxSlides] = useState<
    Array<{ src: string; alt?: string }>
  >([]);

  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: [
      ...baseEditorExtensions(placeholder),
      BulletList,
      OrderedList,
      ListItem,
      TaskImage.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class:
            "my-2 max-h-64 max-w-full cursor-zoom-in rounded-lg border object-contain shadow-sm",
        },
      }),
    ],
    content: value || "",
    onUpdate: ({ editor: currentEditor }) => {
      onChange?.(normalize(currentEditor.getHTML()));
    },
    editorProps: {
      attributes: {
        class: "min-h-[60px] px-3 py-2 text-sm leading-relaxed outline-none",
      },
      handlePaste: (_view, event) => {
        const image = [...(event.clipboardData?.items ?? [])].find(
          (item) => item.kind === "file" && item.type.startsWith("image/"),
        );
        const file = image?.getAsFile();
        if (!file || !onPasteImage) return false;
        event.preventDefault();
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
        return true;
      },
      handleClick: (view, _pos, event) => {
        const target = event.target;
        if (!(target instanceof HTMLImageElement)) return false;
        const images = [...view.dom.querySelectorAll("img")];
        setLightboxSlides(
          images.map((img) => ({ src: img.src, alt: img.alt || undefined })),
        );
        const index = images.indexOf(target);
        setLightboxIndex(index < 0 ? 0 : index);
        return true;
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = normalize(editor.getHTML());
    const incoming = normalize(value || "");
    if (current !== incoming) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    const transaction = editor.state.tr;
    let changed = false;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name !== "image") return;
      const attachmentId = node.attrs.attachmentId as string | null;
      const freshUrl = attachmentId ? imageUrls[attachmentId] : undefined;
      if (freshUrl && node.attrs.src !== freshUrl) {
        transaction.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          src: freshUrl,
        });
        changed = true;
      }
    });
    if (changed) editor.view.dispatch(transaction);
  }, [editor, imageUrls]);

  if (!editor) return null;
  const isEmpty = !value || value === "<p></p>";

  const enterEdit = (): void => {
    if (editing) return;
    setEditing(true);
    editor.setEditable(true);
    editor.commands.focus("end");
  };

  const exitEdit = (): void => {
    onSave(normalize(editor.getHTML()));
    editor.setEditable(false);
    setEditing(false);
  };

  return (
    <>
      <div
        onClick={enterEdit}
        onBlur={(event) => {
          if (
            editing &&
            !event.currentTarget.contains(event.relatedTarget as Node | null)
          ) {
            exitEdit();
          }
        }}
        className={cn(
          "relative rounded-lg border transition-colors",
          editing
            ? "border-primary"
            : "cursor-text border-border hover:bg-muted/30",
        )}
      >
        {editing && <DescriptionToolbar editor={editor} />}
        <EditorContent editor={editor} />
        {!editing && isEmpty && (
          <p className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">
            {placeholder}
          </p>
        )}
      </div>
      <ImageLightbox
        open={lightboxIndex !== null}
        slides={lightboxSlides}
        index={lightboxIndex ?? 0}
        onClose={() => setLightboxIndex(null)}
      />
    </>
  );
}
