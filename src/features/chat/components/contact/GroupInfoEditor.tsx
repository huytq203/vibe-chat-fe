'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import type { Conversation } from '@/features/chat/types';
import { useUpdateConversation } from '@/features/chat/hooks/use-mutations';
import { ProfileImageUploader } from './ProfileImageUploader';

type GroupInfoEditorProps = {
  conversation: Conversation;
  /** Được sửa tên/mô tả/avatar (theo whoCanEditInfo). */
  canEditInfo: boolean;
};

const textareaCls =
  'w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none';

/** Sửa tên + mô tả + avatar nhóm (xem 28-group-settings.md §1). Chỉ gửi field đã đổi. */
export function GroupInfoEditor({ conversation, canEditInfo }: GroupInfoEditorProps) {
  const [name, setName] = useState(conversation.name ?? '');
  const [description, setDescription] = useState(conversation.description ?? '');
  // undefined = chưa đổi avatar; string = mediaId mới upload; null = yêu cầu gỡ avatar.
  const [avatarMediaId, setAvatarMediaId] = useState<string | null | undefined>(undefined);
  const updateMut = useUpdateConversation();

  const trimmedName = name.trim();
  const origName = conversation.name ?? '';
  const origDesc = conversation.description ?? '';
  const avatarDirty = avatarMediaId !== undefined;
  const dirty = trimmedName !== origName || description !== origDesc || avatarDirty;
  const canSave = canEditInfo && dirty && trimmedName.length >= 1 && trimmedName.length <= 150;
  const hasAvatar = avatarMediaId === null ? false : avatarMediaId != null || Boolean(conversation.avatarUrl);

  function handleSave() {
    if (!canSave) return;
    updateMut.mutate(
      {
        conversationId: conversation.id,
        input: {
          ...(trimmedName !== origName ? { name: trimmedName } : {}),
          // Gửi null để xoá mô tả khi người dùng để trống.
          ...(description !== origDesc ? { description: description.trim() || null } : {}),
          ...(avatarDirty ? { avatarMediaId } : {}),
        },
      },
      { onSuccess: () => setAvatarMediaId(undefined) },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-center gap-1.5">
        <ProfileImageUploader
          variant="avatar"
          value={avatarMediaId === null ? null : conversation.avatarUrl}
          name={conversation.name}
          seed={conversation.id}
          disabled={!canEditInfo || updateMut.isPending}
          onUploaded={(id) => setAvatarMediaId(id)}
        />
        {canEditInfo && hasAvatar && (
          <button
            type="button"
            disabled={updateMut.isPending}
            onClick={() => setAvatarMediaId(null)}
            className="text-[11px] text-muted-foreground transition-colors hover:text-danger disabled:opacity-60"
          >
            Gỡ ảnh nhóm
          </button>
        )}
      </div>

      <Input
        label="Tên nhóm"
        value={name}
        maxLength={150}
        disabled={!canEditInfo || updateMut.isPending}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nhập tên nhóm"
      />
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Mô tả</label>
        <textarea
          rows={3}
          maxLength={500}
          value={description}
          disabled={!canEditInfo || updateMut.isPending}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Mô tả nhóm (tuỳ chọn)"
          className={`${textareaCls} disabled:opacity-60`}
        />
      </div>
      {canEditInfo && (
        <Button
          variant="solid"
          size="sm"
          className="self-end"
          disabled={!canSave}
          isLoading={updateMut.isPending}
          onClick={handleSave}
        >
          Lưu thay đổi
        </Button>
      )}
    </div>
  );
}
