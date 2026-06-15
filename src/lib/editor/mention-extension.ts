import Mention from '@tiptap/extension-mention';
import type { Extension, Node } from '@tiptap/core';
import type { SuggestionOptions } from '@tiptap/suggestion';

/**
 * Mention node lưu attrs `{ id, label }` (id = userId hoặc MENTION_ALL).
 * `suggestion` do feature truyền vào để cầu nối sang popup gợi ý hiện có.
 * Chip render class đồng bộ với read path (MentionText).
 */
export function createMentionExtension(
  suggestion: Omit<SuggestionOptions, 'editor'>,
): Node | Extension {
  return Mention.configure({
    HTMLAttributes: { class: 'rounded bg-primary/15 px-0.5 font-medium text-primary' },
    renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
    suggestion,
  });
}
