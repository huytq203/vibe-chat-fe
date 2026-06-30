'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import { Trash2 } from 'lucide-react';
import { tasksApi } from '../../services/tasks.api';
import { useProjectTags } from '../../hooks/useTaskTags';
import type { Project, Tag } from '../../types';

export function ProjectTagsTab({ project }: { project: Project }) {
  const qc = useQueryClient();
  const tagsKey = ['tasks', project.id, 'tags'];
  const { data: tags = [] } = useProjectTags(project.id);

  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const invalidate = () => qc.invalidateQueries({ queryKey: tagsKey });

  const createTag = useMutation({
    mutationFn: () => tasksApi.createTag(project.id, { name: newTagName.trim(), color: newTagColor }),
    onSuccess: () => {
      invalidate();
      setNewTagName('');
      setNewTagColor('#6366f1');
    },
  });

  const updateTag = useMutation({
    mutationFn: () =>
      tasksApi.updateTag(project.id, editingTag!.id, {
        name: editName.trim() || undefined,
        color: editColor || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setEditingTag(null);
    },
  });

  const deleteTag = useMutation({
    mutationFn: (tagId: string) => tasksApi.deleteTag(project.id, tagId),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          placeholder="Tên nhãn…"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newTagName.trim()) createTag.mutate();
          }}
        />
        <input
          type="color"
          value={newTagColor}
          onChange={(e) => setNewTagColor(e.target.value)}
          className="h-9 w-9 cursor-pointer rounded border border-input p-0.5"
          title="Chọn màu"
        />
        <Button size="sm" onClick={() => createTag.mutate()} disabled={!newTagName.trim() || createTag.isPending}>
          Thêm
        </Button>
      </div>

      <div className="space-y-2">
        {tags.map((tag) =>
          editingTag?.id === tag.id ? (
            <div key={tag.id} className="flex items-center gap-2">
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 flex-1 text-sm" />
              <input
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                className="h-8 w-8 cursor-pointer rounded border border-input p-0.5"
              />
              <Button size="sm" className="h-8 px-2 text-xs" onClick={() => updateTag.mutate()} disabled={updateTag.isPending}>
                Lưu
              </Button>
              <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => setEditingTag(null)}>
                Huỷ
              </Button>
            </div>
          ) : (
            <div key={tag.id} className="flex items-center gap-2">
              <Badge style={{ backgroundColor: tag.color, color: '#fff' }} className="text-xs">
                {tag.name}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1 text-xs"
                onClick={() => {
                  setEditingTag(tag);
                  setEditName(tag.name);
                  setEditColor(tag.color);
                }}
              >
                Sửa
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => deleteTag.mutate(tag.id)}
                aria-label={`Xoá ${tag.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ),
        )}
        {tags.length === 0 && <p className="text-xs text-muted-foreground">Chưa có nhãn nào</p>}
      </div>
    </div>
  );
}
