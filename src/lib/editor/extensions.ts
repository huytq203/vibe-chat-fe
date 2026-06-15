import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { FontFamily } from '@tiptap/extension-font-family';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import History from '@tiptap/extension-history';
import type { Extensions } from '@tiptap/core';

/** Extension preset cho ô soạn tin. Mention truyền riêng (cần config suggestion). */
export function baseEditorExtensions(placeholder: string): Extensions {
  return [
    Document, Paragraph, Text,
    Bold, Italic, Underline, Strike,
    TextStyle, Color, FontFamily, Highlight,
    Link.configure({ openOnClick: false, autolink: false }),
    TextAlign.configure({ types: ['paragraph'] }),
    History,
    Placeholder.configure({ placeholder }),
  ];
}
