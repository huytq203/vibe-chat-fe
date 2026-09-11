"use client";

import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import {
  Code2,
  ExternalLink,
  MapPinned,
  Music2,
  Trash2,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button/Button";
import { EMBED_PROVIDERS, resolveEmbed, type EmbedAspect } from "@/lib/editor/embed-providers";
import { cn } from "@/lib/utils/cn";

const FRAME_CLASSES: Record<EmbedAspect, string> = {
  "16:9": "aspect-video",
  "4:3": "aspect-[4/3]",
  "1:1": "aspect-square",
  auto: "h-96",
};

const PROVIDER_ICONS: Readonly<Record<string, LucideIcon>> = {
  codepen: Code2,
  figma: Code2,
  gist: Code2,
  googlemaps: MapPinned,
  loom: Video,
  soundcloud: Music2,
  spotify: Music2,
  vimeo: Video,
  youtube: Video,
};

function stringAttribute(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function aspectAttribute(value: unknown): EmbedAspect {
  return value === "16:9" || value === "4:3" || value === "1:1" ? value : "auto";
}

export function EmbedView({ deleteNode, editor, node, selected }: ReactNodeViewProps) {
  const [loaded, setLoaded] = useState(false);
  const providerId = stringAttribute(node.attrs.provider);
  const requestedSrc = stringAttribute(node.attrs.src);
  const resolved = resolveEmbed(requestedSrc);
  const provider = EMBED_PROVIDERS.find((item) => item.id === providerId);
  const valid = provider && resolved?.provider.id === provider.id;
  const Icon = PROVIDER_ICONS[providerId] ?? ExternalLink;
  const aspect = aspectAttribute(node.attrs.aspect);

  if (!valid) return <NodeViewWrapper data-embed-invalid="" />;

  return (
    <NodeViewWrapper
      className={cn(
        "group/embed relative my-4 overflow-hidden rounded-xl border bg-card",
        selected ? "border-primary" : "border-border",
      )}
      data-embed-view=""
    >
      <div className="pointer-events-none absolute left-2 right-2 top-2 z-20 flex h-10 items-center gap-2 rounded-lg bg-popover px-3 opacity-0 shadow-micro transition-opacity group-hover/embed:pointer-events-auto group-hover/embed:opacity-100 group-focus-within/embed:opacity-100 motion-reduce:transition-none">
        <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-secondary-foreground">
          {provider.label}
        </span>
        <Button
          nativeButton={false}
          render={<a href={resolved.src} rel="noreferrer" target="_blank" />}
          size="sm"
          variant="ghost"
        >
          Mở gốc
          <ExternalLink aria-hidden="true" className="size-3" />
        </Button>
        {editor.isEditable ? (
          <Button aria-label="Xoá nội dung nhúng" size="icon-sm" variant="ghost" onClick={deleteNode}>
            <Trash2 aria-hidden="true" className="size-4" />
          </Button>
        ) : null}
      </div>
      <div className={cn("relative w-full overflow-hidden bg-muted", FRAME_CLASSES[aspect])}>
        {!loaded ? <div aria-label="Đang tải nội dung nhúng" className="absolute inset-0 z-10 animate-pulse bg-muted motion-reduce:animate-none" /> : null}
        <iframe
          allow="autoplay; fullscreen; picture-in-picture"
          className="absolute inset-0 size-full border-0"
          loading="lazy"
          onLoad={() => setLoaded(true)}
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-popups"
          src={resolved.src}
          title={stringAttribute(node.attrs.title) || provider.label}
        />
      </div>
    </NodeViewWrapper>
  );
}
