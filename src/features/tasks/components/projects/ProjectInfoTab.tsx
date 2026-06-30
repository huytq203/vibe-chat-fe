'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input/Input';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { Button } from '@/components/ui/button/Button';
import { tasksApi } from '../../services/tasks.api';
import { taskKeys } from '../../services/keys';
import type { Project } from '../../types';

export function ProjectInfoTab({ project }: { project: Project }) {
  const qc = useQueryClient();
  const [name, setName] = useState(project.name);
  const [desc, setDesc] = useState(project.description ?? '');

  const updateProject = useMutation({
    mutationFn: () =>
      tasksApi.updateProject(project.id, {
        name: name.trim(),
        description: desc.trim() || undefined,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.projects() }),
  });

  const dirty = name.trim() !== project.name || desc.trim() !== (project.description ?? '');

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-cyan-600 text-xl font-bold text-white">
          {project.name.charAt(0).toUpperCase()}
        </span>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-semibold">Tên dự án</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên dự án" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold">Mô tả</label>
        <Textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Mô tả dự án (tuỳ chọn)"
          className="resize-none"
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tạo lúc</p>
          <p className="mt-0.5">{new Date(project.createdAt).toLocaleDateString('vi-VN')}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cập nhật</p>
          <p className="mt-0.5">{new Date(project.updatedAt).toLocaleDateString('vi-VN')}</p>
        </div>
      </div>

      <Button onClick={() => updateProject.mutate()} disabled={!name.trim() || !dirty || updateProject.isPending}>
        {updateProject.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
      </Button>
    </div>
  );
}
