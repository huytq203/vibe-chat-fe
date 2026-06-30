'use client';

import { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BulletList, ListItem, OrderedList } from '@tiptap/extension-list';
import { baseEditorExtensions } from '@/lib/editor/extensions';
import { cn } from '@/lib/utils/cn';
import { DescriptionToolbar } from './DescriptionToolbar';

interface TaskDescriptionEditorProps {
  /** HTML hiện tại của mô tả. */
  value: string;
  /** Lưu khi rời khỏi editor; html = '' nghĩa là rỗng. */
  onSave: (html: string) => void;
  placeholder?: string;
}

/** Coi nội dung tiptap rỗng (chỉ có đoạn trống) là không có mô tả. */
function normalize(html: string): string {
  return html === '<p></p>' ? '' : html;
}

export function TaskDescriptionEditor({
  value,
  onSave,
  placeholder = 'Nhấn để thêm mô tả…',
}: TaskDescriptionEditorProps) {
  const [editing, setEditing] = useState(false);

  // Editor luôn mount (không swap) để view Tiptap gắn DOM ổn định. Mặc định readonly
  // → trông như đoạn văn; click mới bật toolbar + cho sửa.
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: [...baseEditorExtensions(placeholder), BulletList, OrderedList, ListItem],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'min-h-[60px] px-3 py-2 text-sm leading-relaxed outline-none',
      },
    },
  });

  if (!editor) return null;

  const isEmpty = !value || value === '<p></p>';

  const enterEdit = () => {
    if (editing) return;
    setEditing(true);
    editor.setEditable(true);
    editor.commands.focus('end');
  };

  const exitEdit = () => {
    onSave(normalize(editor.getHTML()));
    editor.setEditable(false);
    setEditing(false);
  };

  return (
    <div
      onClick={enterEdit}
      onBlur={(e) => {
        // Thoát khi focus rời khỏi cả cụm (editor + toolbar) → lưu.
        if (editing && !e.currentTarget.contains(e.relatedTarget as Node | null)) exitEdit();
      }}
      className={cn(
        'relative rounded-lg border transition-colors',
        editing ? 'border-primary' : 'cursor-text border-border hover:bg-muted/30',
      )}
    >
      {editing && <DescriptionToolbar editor={editor} />}
      <EditorContent editor={editor} />
      {!editing && isEmpty && (
        <p className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">
          {placeholder}
        </p>
      )}
    </div>
  );
}
