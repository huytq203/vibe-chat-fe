import { useEffect } from 'react';

import { extractHeadingOutline, type OutlineItem } from '@/lib/editor/heading-outline';

interface OutlineEditor {
  readonly document: unknown[];
  onChange: (callback: () => void) => () => void;
}

export function useEditorOutline(
  editor: OutlineEditor,
  onOutlineChange?: (items: OutlineItem[]) => void,
): void {
  useEffect(() => {
    if (!onOutlineChange) return;
    const publishOutline = () => onOutlineChange(extractHeadingOutline(editor.document));
    publishOutline();
    const unsubscribe = editor.onChange(publishOutline);
    return () => {
      unsubscribe();
      onOutlineChange([]);
    };
  }, [editor, onOutlineChange]);
}
