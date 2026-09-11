import { Mark, mergeAttributes, Node, type Extensions } from "@tiptap/core";
import Blockquote from "@tiptap/extension-blockquote";
import Bold from "@tiptap/extension-bold";
import CodeBlock from "@tiptap/extension-code-block";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import { Color } from "@tiptap/extension-color";
import Document from "@tiptap/extension-document";
import Heading from "@tiptap/extension-heading";
import Highlight from "@tiptap/extension-highlight";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Image from "@tiptap/extension-image";
import Italic from "@tiptap/extension-italic";
import Link from "@tiptap/extension-link";
import {
  BulletList,
  ListItem,
  OrderedList,
  TaskItem,
  TaskList,
} from "@tiptap/extension-list";
import Paragraph from "@tiptap/extension-paragraph";
import Strike from "@tiptap/extension-strike";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import Text from "@tiptap/extension-text";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { Dropcursor, Gapcursor, Placeholder, TrailingNode, UndoRedo } from "@tiptap/extensions";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { Doc as YDoc } from "yjs";

import { createCollabCursorElement } from "@/lib/collab";
import { COLLAB_FRAGMENT_NAME } from "@/lib/collab/constants";
import type { CollabProvider } from "@/lib/collab/provider";
import { EMBED_ASPECTS, resolveEmbed, type EmbedAspect } from "@/lib/editor/embed-providers";

import { EmbedView } from "./EmbedView";
import { CodeBlockView } from "./CodeBlockView";
import { CodeBlockHighlight } from "./code-block-highlight";
import { ImageView } from "./ImageView";

const DEFAULT_PLACEHOLDER = "Nhấn `/` để chèn khối";

const InlineCode = Mark.create({
  name: "code",
  code: true,
  excludes: "_",
  exitable: true,
  parseHTML: () => [{ tag: "code" }],
  renderHTML: ({ HTMLAttributes }) => ["code", mergeAttributes(HTMLAttributes), 0],
});

const NoteCodeBlock = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
}).configure({ defaultLanguage: "text" });

const NoteImage = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});

const NamedHighlight = Highlight.extend({
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-color"),
        renderHTML: (attributes) => typeof attributes.color === "string"
          ? { "data-color": attributes.color }
          : {},
      },
    };
  },
}).configure({ multicolor: true });

function embedAttribute(element: HTMLElement, name: string): string | null {
  return element.getAttribute(name);
}

function isEmbedAspect(value: unknown): value is EmbedAspect {
  return typeof value === "string"
    && EMBED_ASPECTS.some((aspect) => aspect === value);
}

function embedAspect(value: unknown, fallback: EmbedAspect): EmbedAspect {
  return isEmbedAspect(value) ? value : fallback;
}

export const Embed = Node.create({
  name: "embed",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      provider: { default: null, rendered: false },
      src: { default: null, rendered: false },
      title: { default: null, rendered: false },
      aspect: { default: "auto", rendered: false },
    };
  },
  parseHTML() {
    return [{
      tag: "figure[data-embed]",
      getAttrs: (element) => {
        if (!(element instanceof HTMLElement)) return false;
        const iframe = element.querySelector("iframe[src]");
        const resolved = iframe ? resolveEmbed(iframe.getAttribute("src") ?? "") : null;
        const providerId = embedAttribute(element, "data-provider");
        if (!resolved || resolved.provider.id !== providerId) return false;
        return {
          provider: providerId,
          src: resolved.src,
          title: iframe?.getAttribute("title"),
          aspect: embedAspect(embedAttribute(element, "data-aspect"), resolved.aspect),
        };
      },
    }];
  },
  renderHTML({ node }) {
    const providerId = typeof node.attrs.provider === "string" ? node.attrs.provider : "";
    const src = typeof node.attrs.src === "string" ? node.attrs.src : "";
    const resolved = resolveEmbed(src);
    if (!resolved || resolved.provider.id !== providerId) return ["figure", { "data-embed": "" }];
    const aspect = embedAspect(node.attrs.aspect, resolved.aspect);
    const title = typeof node.attrs.title === "string" ? node.attrs.title : resolved.provider.label;
    return [
      "figure",
      { "data-embed": "", "data-provider": providerId, "data-aspect": aspect },
      ["iframe", {
        src: resolved.src,
        title,
        sandbox: "allow-scripts allow-same-origin allow-popups",
        loading: "lazy",
        referrerpolicy: "strict-origin-when-cross-origin",
        allow: "autoplay; fullscreen; picture-in-picture",
      }],
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(EmbedView);
  },
});

/** Schema nguồn sự thật, dùng chung cho editor thường và chuyển đổi headless phía server. */
export const NOTE_EDITOR_BASE_EXTENSIONS: Extensions = [
  Document,
  Paragraph,
  Text,
  Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
  Blockquote,
  HorizontalRule,
  NoteCodeBlock,
  CodeBlockHighlight,
  Bold,
  Italic,
  Strike,
  Underline,
  InlineCode,
  Link.configure({ openOnClick: false, autolink: false }),
  BulletList,
  OrderedList,
  ListItem,
  TaskList,
  TaskItem.configure({ nested: true }),
  NoteImage,
  Embed,
  TextStyle,
  Color,
  NamedHighlight,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
  Gapcursor,
  Dropcursor,
  Placeholder.configure({ placeholder: DEFAULT_PLACEHOLDER }),
  TrailingNode.configure({ node: "paragraph" }),
  UndoRedo,
];

interface CollaborativeNoteEditorExtensionsOptions {
  doc: YDoc;
  provider: CollabProvider;
}

interface CursorUser {
  id?: string;
  name: string;
  color: string;
}

function stringField(value: object, key: string): string | undefined {
  const field = Reflect.get(value, key);
  return typeof field === "string" ? field : undefined;
}

function cursorUser(value: unknown): CursorUser {
  if (!value || typeof value !== "object") {
    return { name: "Người dùng Halo", color: "#64748b" };
  }
  return {
    id: stringField(value, "id"),
    name: stringField(value, "name") ?? "Người dùng Halo",
    color: stringField(value, "color") ?? "#64748b",
  };
}

function localCursorUser(provider: CollabProvider): CursorUser {
  return cursorUser(provider.awareness?.getLocalState()?.user);
}

/** Tập extension cộng tác dùng lịch sử y-undo riêng, không giữ UndoRedo thường. */
export function createCollaborativeNoteEditorExtensions({
  doc,
  provider,
}: CollaborativeNoteEditorExtensionsOptions): Extensions {
  const withoutUndoRedo = NOTE_EDITOR_BASE_EXTENSIONS.filter(
    (extension) => extension.name !== UndoRedo.name,
  );
  return [
    ...withoutUndoRedo,
    Collaboration.configure({ document: doc, field: COLLAB_FRAGMENT_NAME }),
    CollaborationCaret.configure({
      provider,
      user: localCursorUser(provider),
      render: (user) => createCollabCursorElement(cursorUser(user)),
    }),
  ];
}
