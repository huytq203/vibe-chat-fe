import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import type { ThemedToken } from "shiki";

import {
  asBundledLanguage,
  getCodeHighlighter,
  isHighlightableLanguage,
  resolveCodeLanguage,
} from "@/features/notes/lib/code-highlighting";

const highlightKey = new PluginKey<DecorationSet>("noteCodeBlockHighlight");

interface HighlightSpan {
  from: number;
  style: string;
  to: number;
}

function tokenStyle(token: ThemedToken): string {
  return Object.entries(token.htmlStyle ?? {})
    .map(([property, value]) => `${property}:${value}`)
    .join(";");
}

function spansFromTokens(tokens: ThemedToken[][]): HighlightSpan[] {
  return tokens.flatMap((line) => line.flatMap((token) => {
    const style = tokenStyle(token);
    if (!style || !token.content) return [];
    return [{ from: token.offset, style, to: token.offset + token.content.length }];
  }));
}

function cacheKey(text: string, language: string): string {
  return `${language}\u0000${text}`;
}

function decorationsFrom(
  doc: ProseMirrorNode,
  cache: ReadonlyMap<string, HighlightSpan[]>,
): DecorationSet {
  const decorations: Decoration[] = [];
  doc.descendants((node, position) => {
    if (node.type.name !== "codeBlock") return;
    const language = resolveCodeLanguage(
      typeof node.attrs.language === "string" ? node.attrs.language : undefined,
    );
    for (const span of cache.get(cacheKey(node.textContent, language)) ?? []) {
      decorations.push(Decoration.inline(
        position + 1 + span.from,
        position + 1 + span.to,
        { class: "notes-editor-next__code-token", style: span.style },
      ));
    }
  });
  return DecorationSet.create(doc, decorations);
}

async function highlight(text: string, languageValue: string): Promise<HighlightSpan[]> {
  const language = resolveCodeLanguage(languageValue);
  if (!isHighlightableLanguage(language)) return [];
  try {
    const highlighter = await getCodeHighlighter();
    const bundledLanguage = asBundledLanguage(language);
    if (!highlighter.getLoadedLanguages().includes(bundledLanguage)) {
      await highlighter.loadLanguage(bundledLanguage);
    }
    const result = highlighter.codeToTokens(text, {
      defaultColor: false,
      lang: bundledLanguage,
      themes: { dark: "github-dark", light: "github-light" },
    });
    return spansFromTokens(result.tokens);
  } catch {
    // Grammar lỗi hoặc chưa tải được phải hạ xuống văn bản thuần, không chặn editor.
    return [];
  }
}

function requestMissingHighlights(
  view: EditorView,
  cache: Map<string, HighlightSpan[]>,
  pending: Map<string, Promise<HighlightSpan[]>>,
): void {
  view.state.doc.descendants((node) => {
    if (node.type.name !== "codeBlock") return;
    const language = resolveCodeLanguage(
      typeof node.attrs.language === "string" ? node.attrs.language : undefined,
    );
    const key = cacheKey(node.textContent, language);
    if (cache.has(key)) return;
    const task = pending.get(key) ?? highlight(node.textContent, language);
    pending.set(key, task);
    void task.then((spans) => {
      cache.set(key, spans);
      pending.delete(key);
      if (!view.isDestroyed) view.dispatch(view.state.tr.setMeta(highlightKey, true));
    });
  });
}

function createHighlightPlugin(): Plugin<DecorationSet> {
  const cache = new Map<string, HighlightSpan[]>();
  const pending = new Map<string, Promise<HighlightSpan[]>>();
  return new Plugin({
    key: highlightKey,
    state: {
      init: (_, state: EditorState) => decorationsFrom(state.doc, cache),
      apply: (transaction, current, _oldState, newState) => (
        transaction.docChanged || transaction.getMeta(highlightKey)
          ? decorationsFrom(newState.doc, cache)
          : current
      ),
    },
    props: { decorations: (state) => highlightKey.getState(state) },
    view: (view) => {
      requestMissingHighlights(view, cache, pending);
      return {
        update: (updatedView, previousState) => {
          if (!updatedView.state.doc.eq(previousState.doc)) {
            requestMissingHighlights(updatedView, cache, pending);
          }
        },
      };
    },
  });
}

/** Decoration bất đồng bộ dùng Shiki nhưng không đưa token vào document cộng tác. */
export const CodeBlockHighlight = Extension.create({
  name: "noteCodeBlockHighlight",
  addProseMirrorPlugins() {
    return [createHighlightPlugin()];
  },
});
