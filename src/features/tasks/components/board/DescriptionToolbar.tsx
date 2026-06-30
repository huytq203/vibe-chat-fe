'use client';

import { type Editor, useEditorState } from '@tiptap/react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Strikethrough,
  Underline,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ToolbarBtnProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onRun: () => void;
}

function ToolbarBtn({ icon, label, active, onRun }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      // preventDefault để không cướp focus khỏi editor → giữ vùng chọn khi áp định dạng.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onRun}
      className={cn(
        'grid h-7 w-7 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        active && 'bg-primary/15 text-primary',
      )}
    >
      {icon}
    </button>
  );
}

/** Thanh định dạng cho editor mô tả: đậm/nghiêng/gạch/tô sáng/list/căn lề. */
export function DescriptionToolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      highlight: e.isActive('highlight'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      left: e.isActive({ textAlign: 'left' }),
      center: e.isActive({ textAlign: 'center' }),
      right: e.isActive({ textAlign: 'right' }),
    }),
  });

  const ic = 'h-4 w-4';

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-1 py-1">
      <ToolbarBtn icon={<Bold className={ic} />} label="Đậm" active={state.bold} onRun={() => editor.chain().focus().toggleBold().run()} />
      <ToolbarBtn icon={<Italic className={ic} />} label="Nghiêng" active={state.italic} onRun={() => editor.chain().focus().toggleItalic().run()} />
      <ToolbarBtn icon={<Underline className={ic} />} label="Gạch chân" active={state.underline} onRun={() => editor.chain().focus().toggleUnderline().run()} />
      <ToolbarBtn icon={<Strikethrough className={ic} />} label="Gạch ngang" active={state.strike} onRun={() => editor.chain().focus().toggleStrike().run()} />
      <ToolbarBtn icon={<Highlighter className={ic} />} label="Tô sáng" active={state.highlight} onRun={() => editor.chain().focus().toggleHighlight().run()} />

      <span className="mx-0.5 h-5 w-px bg-border" />
      <ToolbarBtn icon={<List className={ic} />} label="Danh sách chấm" active={state.bullet} onRun={() => editor.chain().focus().toggleBulletList().run()} />
      <ToolbarBtn icon={<ListOrdered className={ic} />} label="Danh sách số" active={state.ordered} onRun={() => editor.chain().focus().toggleOrderedList().run()} />

      <span className="mx-0.5 h-5 w-px bg-border" />
      <ToolbarBtn icon={<AlignLeft className={ic} />} label="Căn trái" active={state.left} onRun={() => editor.chain().focus().setTextAlign('left').run()} />
      <ToolbarBtn icon={<AlignCenter className={ic} />} label="Căn giữa" active={state.center} onRun={() => editor.chain().focus().setTextAlign('center').run()} />
      <ToolbarBtn icon={<AlignRight className={ic} />} label="Căn phải" active={state.right} onRun={() => editor.chain().focus().setTextAlign('right').run()} />
    </div>
  );
}
