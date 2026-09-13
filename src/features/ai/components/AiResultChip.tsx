'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';

const TASK_TOOLS = new Set([
  'create_project',
  'create_task',
  'update_task',
  'add_checklist_items',
  'complete_task',
  'reopen_task',
  'delete_task',
  'create_tag',
  'tag_task',
  'untag_task',
  'attach_file',
]);

const NOTE_TOOLS = new Set([
  'create_page',
  'write_page_content',
  'rename_page',
  'delete_page',
]);

interface AiResultChipProps {
  content: string;
  toolNames?: string[];
}

function readField(content: string, name: string): string | null {
  const match = new RegExp(`["']?${name}["']?\\s*[:=]\\s*["']([^"'\\s,}]+)`, 'i')
    .exec(content);
  return match?.[1] ?? null;
}

function taskHref(content: string): string {
  const urlMatch = /\/work\?project=([^&\s)]+)&task=([^\s)]+)/i.exec(content);
  const projectId = urlMatch?.[1] ?? readField(content, 'projectId');
  const taskId = urlMatch?.[2] ?? readField(content, 'taskId');
  if (!projectId || !taskId) return '/work';
  return `/work?project=${encodeURIComponent(projectId)}&task=${encodeURIComponent(taskId)}`;
}

function noteHref(content: string): string {
  const pageId = readField(content, 'pageId');
  return pageId ? `/notes/${encodeURIComponent(pageId)}` : '/notes';
}

export function AiResultChip({ content, toolNames }: AiResultChipProps) {
  const hasTaskResult = toolNames?.some((name) => TASK_TOOLS.has(name)) ?? false;
  const hasNoteResult = toolNames?.some((name) => NOTE_TOOLS.has(name)) ?? false;
  if (!hasTaskResult && !hasNoteResult) return null;

  const href = hasTaskResult ? taskHref(content) : noteHref(content);
  const label = hasTaskResult ? 'Mở app task' : 'Mở ghi chú';

  return (
    <Button
      render={<Link href={href} />}
      variant="outline"
      size="xs"
      className="mt-2 h-7 min-h-0 w-fit gap-1.5 rounded-lg px-2.5 text-xs"
    >
      {label}
      <ExternalLink className="size-3" aria-hidden="true" />
    </Button>
  );
}
