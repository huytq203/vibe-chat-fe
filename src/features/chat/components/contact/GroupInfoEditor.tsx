'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { useImageUpload } from '@/features/auth';
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
  // Ảnh chỉ preview tới khi lưu: file = ảnh mới chờ upload; removed = yêu cầu gỡ.
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const { upload, uploading } = useImageUpload('AVATAR');
  const updateMut = useUpdateConversation();

  const trimmedName = name.trim();
  const origName = conversation.name ?? '';
  const origDesc = conversation.description ?? '';
  const avatarDirty = avatarFile !== null || avatarRemoved;
  const dirty = trimmedName !== origName || description !== origDesc || avatarDirty;
  const canSave = canEditInfo && dirty && trimmedName.length >= 1 && trimmedName.length <= 150;
  const busy = updateMut.isPending || uploading;
  const hasAvatar = !avatarRemoved && (avatarFile !== null || Boolean(conversation.avatarUrl));

  async function handleSave() {
    if (!canSave) return;
    // Chỉ upload ảnh khi thật sự bấm Lưu (tránh ảnh rác). null = gỡ avatar.
    let avatarMediaId: string | null | undefined;
    if (avatarFile) {
      const up = await upload(avatarFile);
      if (!up) return; // lỗi đã hiển thị trong hook
      avatarMediaId = up.id;
    } else if (avatarRemoved) {
      avatarMediaId = null;
    }
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
      {
        onSuccess: () => {
          setAvatarFile(null);
          setAvatarRemoved(false);
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-center gap-1.5">
        <ProfileImageUploader
          variant="avatar"
          value={conversation.avatarUrl}
          pendingFile={avatarFile}
          removed={avatarRemoved}
          name={conversation.name}
          type="group"
          disabled={!canEditInfo || busy}
          onSelect={(file) => {
            setAvatarFile(file);
            setAvatarRemoved(false);
          }}
        />
        {canEditInfo && hasAvatar && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setAvatarFile(null);
              setAvatarRemoved(true);
            }}
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
        disabled={!canEditInfo || busy}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nhập tên nhóm"
      />
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Mô tả</label>
        <textarea
          rows={3}
          maxLength={500}
          value={description}
          disabled={!canEditInfo || busy}
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
          isLoading={busy}
          onClick={handleSave}
        >
          Lưu thay đổi
        </Button>
      )}
    </div>
  );
}
