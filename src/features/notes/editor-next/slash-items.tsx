import type { Editor, Range } from "@tiptap/core";
import { format } from "date-fns";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  CalendarDays,
  Code2,
  CopyPlus,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Image as ImageIcon,
  Link2,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  MapPinned,
  Music2,
  PanelsTopLeft,
  Quote,
  Table as TableIcon,
  Text,
  Trash2,
  Video,
} from "lucide-react";
import type { ReactNode } from "react";

import { EMBED_PROVIDERS, resolveEmbed } from "@/lib/editor/embed-providers";

import { activeBlockAt, deleteBlock, duplicateBlock } from "./BlockMenu";
import type { SuggestionItem, SuggestionItemGroup } from "./suggestion-popup";

const BASIC: SuggestionItemGroup = "Cơ bản";
const LISTS: SuggestionItemGroup = "Danh sách";
const INSERT: SuggestionItemGroup = "Chèn";
const ALIGN: SuggestionItemGroup = "Căn lề";
const BLOCK: SuggestionItemGroup = "Khối";

function heading(level: 1 | 2 | 3 | 4 | 5 | 6, icon: ReactNode): SuggestionItem {
  return {
    id: `h${level}`,
    title: `Tiêu đề ${level}`,
    keywords: [`h${level}`, `heading${level}`, `tieu de ${level}`, "title"],
    group: BASIC,
    icon,
    run: (editor, range) => editor.chain().focus().deleteRange(range)
      .toggleHeading({ level }).run(),
  };
}

function deleteCurrentBlock(editor: Editor, range: Range): void {
  const block = activeBlockAt(editor, range.from);
  if (block) deleteBlock(editor, block);
}

function duplicateCurrentBlock(editor: Editor, range: Range): void {
  editor.chain().focus().deleteRange(range).run();
  const block = activeBlockAt(editor, range.from);
  if (block) duplicateBlock(editor, block);
}

const EMBED_ITEM_META: ReadonlyArray<{
  icon: ReactNode;
  id: string;
  keywords: readonly string[];
  providerId: string;
  title: string;
}> = [
  { id: "youtube", providerId: "youtube", title: "YouTube", icon: <Video />, keywords: ["video", "youtube"] },
  { id: "vimeo", providerId: "vimeo", title: "Vimeo", icon: <Video />, keywords: ["video", "vimeo"] },
  { id: "loom", providerId: "loom", title: "Loom", icon: <Video />, keywords: ["video", "screen recording", "quay man hinh"] },
  { id: "map", providerId: "googlemaps", title: "Bản đồ", icon: <MapPinned />, keywords: ["map", "maps", "google maps", "ban do", "dia diem"] },
  { id: "figma", providerId: "figma", title: "Figma", icon: <PanelsTopLeft />, keywords: ["design", "thiet ke", "prototype"] },
  { id: "codepen", providerId: "codepen", title: "CodePen", icon: <Code2 />, keywords: ["code", "pen", "demo"] },
  { id: "gist", providerId: "gist", title: "GitHub Gist", icon: <Code2 />, keywords: ["github", "code", "ma nguon"] },
  { id: "spotify", providerId: "spotify", title: "Spotify", icon: <Music2 />, keywords: ["music", "podcast", "nhac"] },
  { id: "soundcloud", providerId: "soundcloud", title: "SoundCloud", icon: <Music2 />, keywords: ["audio", "music", "nhac", "am thanh"] },
];

function insertEmbed(editor: Editor, range: Range, url: string | undefined): void {
  if (!url) return;
  const resolved = resolveEmbed(url);
  if (!resolved) return;
  editor.chain().focus().deleteRange(range).insertContent({
    type: "embed",
    attrs: {
      aspect: resolved.aspect,
      provider: resolved.provider.id,
      src: resolved.src,
      title: resolved.provider.label,
    },
  }).run();
}

function embedItem(meta: (typeof EMBED_ITEM_META)[number]): SuggestionItem {
  const label = EMBED_PROVIDERS.find((provider) => provider.id === meta.providerId)?.label;
  return {
    id: meta.id,
    title: label ?? meta.title,
    subtitle: `Nhúng nội dung từ ${label ?? meta.title}`,
    keywords: meta.keywords,
    group: INSERT,
    icon: meta.icon,
    prompt: "embed",
    embedProviderId: meta.providerId,
    run: insertEmbed,
  };
}

export const SLASH_ITEMS: readonly SuggestionItem[] = [
  { id: "paragraph", title: "Văn bản", subtitle: "Đoạn văn thường", keywords: ["text", "paragraph", "van ban", "doan van"], group: BASIC, icon: <Text />, run: (e, r) => e.chain().focus().deleteRange(r).setParagraph().run() },
  heading(1, <Heading1 />),
  heading(2, <Heading2 />),
  heading(3, <Heading3 />),
  heading(4, <Heading4 />),
  heading(5, <Heading5 />),
  heading(6, <Heading6 />),
  { id: "quote", title: "Trích dẫn", keywords: ["quote", "blockquote", "trich dan"], group: BASIC, icon: <Quote />, run: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run() },
  { id: "code", title: "Khối mã", subtitle: "Đoạn mã", keywords: ["code", "pre", "ma", "codeblock"], group: BASIC, icon: <Code2 />, run: (e, r) => e.chain().focus().deleteRange(r).toggleCodeBlock().run() },
  { id: "bullet", title: "Danh sách", subtitle: "Gạch đầu dòng", keywords: ["ul", "list", "bullet", "danh sach", "gach dau dong"], group: LISTS, icon: <List />, run: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run() },
  { id: "ordered", title: "Danh sách số", keywords: ["ol", "number", "so", "numbered"], group: LISTS, icon: <ListOrdered />, run: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run() },
  { id: "task", title: "Danh sách việc", subtitle: "Ô tích chọn", keywords: ["todo", "task", "check", "viec", "checkbox"], group: LISTS, icon: <ListTodo />, run: (e, r) => e.chain().focus().deleteRange(r).toggleTaskList().run() },
  { id: "table", title: "Bảng", subtitle: "Chọn số cột và hàng", keywords: ["table", "bang", "grid"], group: INSERT, icon: <TableIcon />, run: (e, r) => {
    const storage = Reflect.get(e.storage, "slashCommand");
    const open = storage && typeof storage === "object"
      ? Reflect.get(storage, "openTableGrid")
      : undefined;
    if (typeof open === "function") open(r);
    else e.chain().focus().deleteRange(r).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  } },
  { id: "table-quick", title: "Bảng nhanh 3×3", subtitle: "Chèn ngay bảng 3 cột × 3 hàng", keywords: ["bang nhanh", "grid 3x3", "quick table"], group: INSERT, icon: <TableIcon />, run: (e, r) => e.chain().focus().deleteRange(r).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { id: "image", title: "Ảnh", subtitle: "Tải lên từ máy hoặc chèn URL", keywords: ["image", "img", "anh", "picture", "photo"], group: INSERT, icon: <ImageIcon />, prompt: "image", run: (e, r, url) => { if (url) e.chain().focus().deleteRange(r).setImage({ src: url }).run(); } },
  { id: "link", title: "Liên kết", subtitle: "Chèn liên kết theo URL", keywords: ["link", "url", "lien ket"], group: INSERT, icon: <Link2 />, prompt: "link", run: (e, r, href) => { if (href) e.chain().focus().deleteRange(r).insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] }).run(); } },
  { id: "embed", title: "Nhúng", subtitle: "Nhúng URL từ dịch vụ hỗ trợ", keywords: ["embed", "nhung", "video", "audio", "url"], group: INSERT, icon: <PanelsTopLeft />, prompt: "embed", run: insertEmbed },
  ...EMBED_ITEM_META.map(embedItem),
  { id: "hr", title: "Đường kẻ ngang", keywords: ["hr", "divider", "line", "ke ngang", "ngan cach"], group: INSERT, icon: <Minus />, run: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run() },
  { id: "today", title: "Ngày hôm nay", subtitle: "Chèn ngày theo dd/MM/yyyy", keywords: ["date", "today", "ngay", "hom nay"], group: INSERT, icon: <CalendarDays />, run: (e, r) => e.chain().focus().deleteRange(r).insertContent(format(new Date(), "dd/MM/yyyy")).run() },
  { id: "align-left", title: "Căn trái", keywords: ["left", "trai", "align", "can le"], group: ALIGN, icon: <AlignLeft />, run: (e, r) => e.chain().focus().deleteRange(r).setTextAlign("left").run() },
  { id: "align-center", title: "Căn giữa", keywords: ["center", "giua", "align", "can le"], group: ALIGN, icon: <AlignCenter />, run: (e, r) => e.chain().focus().deleteRange(r).setTextAlign("center").run() },
  { id: "align-right", title: "Căn phải", keywords: ["right", "phai", "align", "can le"], group: ALIGN, icon: <AlignRight />, run: (e, r) => e.chain().focus().deleteRange(r).setTextAlign("right").run() },
  { id: "duplicate", title: "Nhân đôi khối", keywords: ["duplicate", "copy", "nhan doi", "sao chep"], group: BLOCK, icon: <CopyPlus />, run: duplicateCurrentBlock },
  { id: "delete", title: "Xoá khối", keywords: ["delete", "remove", "xoa", "xoa khoi"], group: BLOCK, icon: <Trash2 />, run: deleteCurrentBlock },
];

/** Chuẩn hoá tìm kiếm tiếng Việt để truy vấn có dấu và không dấu cho cùng kết quả. */
export function normalizeQuery(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/gi, "d").trim().toLowerCase();
}

function searchableValues(item: SuggestionItem): string[] {
  return [item.title, item.subtitle ?? "", ...item.keywords].map(normalizeQuery);
}

export function filterSlashItems(query: string): SuggestionItem[] {
  const normalized = normalizeQuery(query);
  if (!normalized) return [...SLASH_ITEMS];
  const matches = SLASH_ITEMS.flatMap((item, index) => {
    const values = searchableValues(item);
    if (!values.some((value) => value.includes(normalized))) return [];
    return [{ item, index, rank: values.some((value) => value.startsWith(normalized)) ? 0 : 1 }];
  });
  return matches
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map(({ item }) => ({ ...item, group: undefined }));
}
