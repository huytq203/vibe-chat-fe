'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog/Dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs/Tabs';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { Badge } from '@/components/ui/badge/Badge';
import { Trash2, UserMinus, UserPlus } from 'lucide-react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { tasksApi } from '../services/tasks.api';
import { useProjectTags } from '../hooks/useTaskTags';
import { useMembers, useAddMember, useRemoveMember } from '../hooks/useMembers';
import { useTasksUIStore } from '../stores/tasks-ui.store';
import type { Project, Tag } from '../types';

interface Props {
  project: Project;
}

export function ProjectSettingsModal({ project }: Props) {
  const qc = useQueryClient();
  const settingsModal = useTasksUIStore((s) => s.settingsModal);
  const closeSettings = useTasksUIStore((s) => s.closeSettings);

  // Tab: Thông tin
  const [name, setName] = useState(project.name);
  const [desc, setDesc] = useState(project.description ?? '');
  const updateProject = useMutation({
    mutationFn: () =>
      tasksApi.updateProject(project.id, {
        name: name.trim(),
        description: desc.trim() || undefined,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', 'projects'] }),
  });

  // Tab: Chia sẻ (members)
  const { data: members = [] } = useMembers(project.id);
  const addMember = useAddMember(project.id);
  const removeMember = useRemoveMember(project.id);
  const [inviteUserId, setInviteUserId] = useState('');

  const handleInvite = () => {
    const uid = inviteUserId.trim();
    if (!uid || addMember.isPending) return;
    addMember.mutate(uid, { onSuccess: () => setInviteUserId('') });
  };

  // Tab: Nhãn (tags)
  const { data: tags = [] } = useProjectTags(project.id);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const createTag = useMutation({
    mutationFn: () =>
      tasksApi.createTag(project.id, { name: newTagName.trim(), color: newTagColor }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', project.id, 'tags'] });
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
      qc.invalidateQueries({ queryKey: ['tasks', project.id, 'tags'] });
      setEditingTag(null);
    },
  });

  const deleteTag = useMutation({
    mutationFn: (tagId: string) => tasksApi.deleteTag(project.id, tagId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', project.id, 'tags'] }),
  });

  const open = settingsModal.open;
  const defaultTab = settingsModal.open ? settingsModal.tab : 'info';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeSettings()}>
      <DialogContent className="max-w-[600px]">
        <DialogTitle>Cài đặt project</DialogTitle>
        <Tabs defaultValue={defaultTab} key={defaultTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="info">Thông tin</TabsTrigger>
            <TabsTrigger value="share">Chia sẻ</TabsTrigger>
            <TabsTrigger value="labels">Nhãn</TabsTrigger>
          </TabsList>

          {/* Tab: Thông tin */}
          <TabsContent value="info" className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Tên project</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tên project"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Mô tả</label>
              <Textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Mô tả project (tuỳ chọn)"
                className="resize-none"
                rows={3}
              />
            </div>
            <Button
              onClick={() => updateProject.mutate()}
              disabled={!name.trim() || updateProject.isPending}
            >
              {updateProject.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
            </Button>
          </TabsContent>

          {/* Tab: Chia sẻ */}
          <TabsContent value="share" className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={inviteUserId}
                onChange={(e) => setInviteUserId(e.target.value)}
                placeholder="User ID để mời…"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInvite();
                }}
              />
              <Button
                onClick={handleInvite}
                disabled={!inviteUserId.trim() || addMember.isPending}
                size="sm"
              >
                <UserPlus className="mr-1 h-4 w-4" /> Mời
              </Button>
            </div>
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.userId}
                  className="flex items-center gap-3 rounded border border-border px-3 py-2"
                >
                  <Avatar
                    src={m.avatarUrl ?? undefined}
                    alt={m.displayName}
                    fallback={m.displayName.charAt(0).toUpperCase()}
                    className="h-8 w-8"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{m.displayName}</p>
                    <p className="text-xs text-muted-foreground">{m.role}</p>
                  </div>
                  {m.role !== 'OWNER' && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeMember.mutate(m.userId)}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Tab: Nhãn */}
          <TabsContent value="labels" className="space-y-4">
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
              <Button
                size="sm"
                onClick={() => createTag.mutate()}
                disabled={!newTagName.trim() || createTag.isPending}
              >
                Thêm
              </Button>
            </div>
            <div className="space-y-2">
              {tags.map((tag) =>
                editingTag?.id === tag.id ? (
                  <div key={tag.id} className="flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 flex-1 text-sm"
                    />
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="h-8 w-8 cursor-pointer rounded border border-input p-0.5"
                    />
                    <Button
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => updateTag.mutate()}
                      disabled={updateTag.isPending}
                    >
                      Lưu
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs"
                      onClick={() => setEditingTag(null)}
                    >
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
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ),
              )}
              {tags.length === 0 && (
                <p className="text-xs text-muted-foreground">Chưa có nhãn nào</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
