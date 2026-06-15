'use client';

import { type Editor, useEditorState } from '@tiptap/react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Highlighter,
  Italic,
  Link as LinkIcon,
  Strikethrough,
  Underline,
} from 'lucide-react';
import { sanitizeLinkUrl } from '@/lib/editor/rich-presets';
import { ToolbarButton } from './ToolbarButton';
import { ColorPopover } from './ColorPopover';
import { FontPopover } from './FontPopover';

type MessageToolbarProps = {
  editor: Editor | null;
  disabled?: boolean;
};

/** Thanh định dạng cho rich editor: đậm/nghiêng/gạch/màu/font/căn lề/link. */
export function MessageToolbar({ editor, disabled }: MessageToolbarProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive('bold'),
            italic: e.isActive('italic'),
            underline: e.isActive('underline'),
            strike: e.isActive('strike'),
            highlight: e.isActive('highlight'),
            link: e.isActive('link'),
            left: e.isActive({ textAlign: 'left' }),
            center: e.isActive({ textAlign: 'center' }),
            right: e.isActive({ textAlign: 'right' }),
          }
        : null,
  });

  if (!editor || !state) return null;

  const run = (fn: (e: Editor) => void) => () => fn(editor);

  const handleLink = () => {
    const prev = (editor.getAttributes('link').href as string | undefined) ?? '';
    const input = window.prompt('Nhập URL liên kết', prev);
    if (input === null) return;
    if (input.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    const href = sanitizeLinkUrl(input);
    if (!href) return;
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-1 pb-1.5">
      <ToolbarButton icon={<Bold className="h-[17px] w-[17px]" />} label="Đậm" active={state.bold} disabled={disabled} onClick={run((e) => e.chain().focus().toggleBold().run())} />
      <ToolbarButton icon={<Italic className="h-[17px] w-[17px]" />} label="Nghiêng" active={state.italic} disabled={disabled} onClick={run((e) => e.chain().focus().toggleItalic().run())} />
      <ToolbarButton icon={<Underline className="h-[17px] w-[17px]" />} label="Gạch chân" active={state.underline} disabled={disabled} onClick={run((e) => e.chain().focus().toggleUnderline().run())} />
      <ToolbarButton icon={<Strikethrough className="h-[17px] w-[17px]" />} label="Gạch ngang" active={state.strike} disabled={disabled} onClick={run((e) => e.chain().focus().toggleStrike().run())} />
      <ToolbarButton icon={<Highlighter className="h-[17px] w-[17px]" />} label="Tô sáng" active={state.highlight} disabled={disabled} onClick={run((e) => e.chain().focus().toggleHighlight().run())} />

      <span className="mx-0.5 h-5 w-px bg-border" />
      <ColorPopover editor={editor} disabled={disabled} />
      <FontPopover editor={editor} disabled={disabled} />

      <span className="mx-0.5 h-5 w-px bg-border" />
      <ToolbarButton icon={<AlignLeft className="h-[17px] w-[17px]" />} label="Căn trái" active={state.left} disabled={disabled} onClick={run((e) => e.chain().focus().setTextAlign('left').run())} />
      <ToolbarButton icon={<AlignCenter className="h-[17px] w-[17px]" />} label="Căn giữa" active={state.center} disabled={disabled} onClick={run((e) => e.chain().focus().setTextAlign('center').run())} />
      <ToolbarButton icon={<AlignRight className="h-[17px] w-[17px]" />} label="Căn phải" active={state.right} disabled={disabled} onClick={run((e) => e.chain().focus().setTextAlign('right').run())} />

      <span className="mx-0.5 h-5 w-px bg-border" />
      <ToolbarButton icon={<LinkIcon className="h-[17px] w-[17px]" />} label="Chèn liên kết" active={state.link} disabled={disabled} onClick={handleLink} />
    </div>
  );
}
