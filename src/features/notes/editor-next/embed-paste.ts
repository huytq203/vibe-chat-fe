import type { EditorView } from "@tiptap/pm/view";

import { resolveEmbed, type ResolvedEmbed } from "@/lib/editor/embed-providers";

interface EmbedPasteEvent {
  clipboardData: { getData: (format: string) => string } | null;
  preventDefault: () => void;
}

export interface EmbedPasteSuggestion {
  from: number;
  left: number;
  resolved: ResolvedEmbed;
  top: number;
  to: number;
  url: string;
}

function pastedUrl(event: EmbedPasteEvent): string | null {
  const value = event.clipboardData?.getData("text/plain").trim() ?? "";
  if (!value || /\s/.test(value)) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

function isEmptyParagraph(view: EditorView): boolean {
  const { $from, empty } = view.state.selection;
  return empty && $from.parent.type.name === "paragraph" && $from.parent.content.size === 0;
}

function suggestionPosition(view: EditorView, position: number): { left: number; top: number } {
  const anchor = view.coordsAtPos(position);
  const container = view.dom.closest(".notes-editor-next__body");
  const bounds = container?.getBoundingClientRect();
  if (!bounds) return { left: 0, top: 0 };
  return {
    left: Math.max(0, Math.min(anchor.left - bounds.left, bounds.width - 180)),
    top: anchor.bottom - bounds.top,
  };
}

export function handleEmbedPaste(
  view: EditorView,
  event: EmbedPasteEvent,
  onSuggest: (suggestion: EmbedPasteSuggestion) => void,
): boolean {
  const url = pastedUrl(event);
  const resolved = url ? resolveEmbed(url) : null;
  const link = view.state.schema.marks.link;
  if (!url || !resolved || !link || !isEmptyParagraph(view)) return false;

  event.preventDefault();
  const { $from } = view.state.selection;
  const insertAt = view.state.selection.from;
  const from = $from.before();
  const linkTo = insertAt + url.length;
  const transaction = view.state.tr
    .insertText(url, insertAt)
    .addMark(insertAt, linkTo, link.create({ href: url }));
  view.dispatch(transaction);
  const to = from + (view.state.doc.nodeAt(from)?.nodeSize ?? url.length + 2);
  onSuggest({ from, ...suggestionPosition(view, linkTo), resolved, to, url });
  return true;
}
