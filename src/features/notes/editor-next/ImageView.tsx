"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useEffect, useState } from "react";

import { resolveAttachmentFileUrl } from "@/features/notes/lib/resolve-file-url";

type ImageState =
  | { status: "error" }
  | { status: "loading" }
  | { src: string; status: "ready" };

function initialState(src: string): ImageState {
  return src.startsWith("attachment://")
    ? { status: "loading" }
    : { src, status: "ready" };
}

interface ResolvedImageProps {
  alt: string;
  src: string;
  title?: string;
}

function ResolvedImage({ alt, src, title }: ResolvedImageProps) {
  const [state, setState] = useState<ImageState>(() => initialState(src));

  useEffect(() => {
    let active = true;
    if (!src.startsWith("attachment://")) return () => { active = false; };
    void resolveAttachmentFileUrl(src)
      .then((resolvedSrc) => {
        if (active) setState({ src: resolvedSrc, status: "ready" });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => { active = false; };
  }, [src]);

  return (
    <NodeViewWrapper className="notes-editor-next__image" data-state={state.status}>
      {state.status === "ready" ? (
        <img alt={alt} draggable={false} src={state.src} title={title} />
      ) : state.status === "loading" ? (
        <span aria-label={`Đang tải ảnh ${alt}`} className="notes-editor-next__image-placeholder" role="status" />
      ) : (
        <span className="notes-editor-next__image-error" role="alert">
          Không tải được ảnh
        </span>
      )}
    </NodeViewWrapper>
  );
}

/** Node view chỉ đổi URL lúc render; thuộc tính `src` trong tài liệu vẫn là attachment://. */
export function ImageView({ node }: NodeViewProps) {
  const src = typeof node.attrs.src === "string" ? node.attrs.src : "";
  const alt = typeof node.attrs.alt === "string" ? node.attrs.alt : "";
  const title = typeof node.attrs.title === "string" ? node.attrs.title : undefined;
  return <ResolvedImage key={src} alt={alt} src={src} title={title} />;
}
