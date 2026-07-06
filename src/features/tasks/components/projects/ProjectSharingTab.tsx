'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { Check, Copy, Link2, RefreshCw, Search, UserMinus, UserPlus, X } from 'lucide-react';
import { useMembers, useAddMember, useRemoveMember } from '../../hooks/useMembers';
import { useUserSearch } from '../../hooks/useUserSearch';
import {
  useProjectInvite,
  useEnableInvite,
  useRotateInvite,
  useDisableInvite,
  useJoinRequests,
  useAcceptJoinRequest,
  useRejectJoinRequest,
} from '../../hooks/useSharing';
import { getCurrentUser } from '../../lib/current-user';
import type { Project } from '../../types';

/** Độ trễ debounce nhỏ để tránh spam directory khi user đang gõ. */
const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export function ProjectSharingTab({ project }: { project: Project }) {
  const { data: members = [] } = useMembers(project.id);
  const addMember = useAddMember(project.id);
  const removeMember = useRemoveMember(project.id);

  // Chỉ OWNER mới quản lý link mời + duyệt yêu cầu.
  const isOwner = getCurrentUser()?.userId === project.ownerId;

  // Ô tìm kiếm: debounce bằng setTimeout — không thêm dependency ngoài.
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const searchActive = debouncedQuery.trim().length >= MIN_QUERY_LENGTH;
  const search = useUserSearch(debouncedQuery);

  // Loại người đã là thành viên khỏi kết quả gợi ý.
  const suggestions = (search.data ?? []).filter(
    (u) => !members.some((m) => m.userId === u.userId),
  );

  const handleInvite = (userId: string) => {
    if (addMember.isPending) return;
    addMember.mutate(userId, {
      onSuccess: () => {
        setQuery('');
        setDebouncedQuery('');
      },
    });
  };

  return (
    <div className="space-y-4">
      {isOwner && <InviteLinkSection projectId={project.id} />}
      {isOwner && <JoinRequestsSection projectId={project.id} />}

      <p className="text-sm text-muted-foreground">
        Quản lý quyền truy cập dự án. Tìm theo tên hoặc email để mời thành viên mới.
      </p>

      <div className="relative">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm người dùng để mời (tối thiểu 2 ký tự)…"
          aria-label="Tìm người dùng để mời"
          icon={<Search className="h-5 w-5" />}
        />

        {searchActive && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md">
            {search.isError ? (
              // Directory (Keycloak) có thể tạm gián đoạn (503) — message thân thiện, không lộ chi tiết.
              <p className="px-3 py-2 text-xs text-danger">
                Không thể tìm kiếm người dùng lúc này. Hệ thống danh bạ đang gián đoạn, vui lòng
                thử lại sau ít phút.
              </p>
            ) : search.isPending ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">Đang tìm…</p>
            ) : suggestions.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                Không tìm thấy người dùng phù hợp
              </p>
            ) : (
              suggestions.map((u) => (
                <button
                  key={u.userId}
                  type="button"
                  onClick={() => handleInvite(u.userId)}
                  disabled={addMember.isPending}
                  className="flex w-full items-center gap-3 rounded px-2 py-1.5 text-left hover:bg-muted disabled:opacity-50"
                >
                  <Avatar
                    src={u.avatarUrl ?? undefined}
                    alt={u.displayName}
                    fallback={u.displayName.charAt(0).toUpperCase()}
                    className="h-7 w-7"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{u.displayName}</span>
                    {u.email && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {u.email}
                      </span>
                    )}
                  </span>
                  <UserPlus className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {addMember.isError && (
        <p className="text-xs text-danger">Mời thành viên thất bại. Vui lòng thử lại.</p>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {members.length} thành viên
        </p>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
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
                  aria-label={`Gỡ ${m.displayName}`}
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Mục quản lý link mời cố định — chỉ OWNER thấy. */
function InviteLinkSection({ projectId }: { projectId: string }) {
  const { data: invite } = useProjectInvite(projectId, true);
  const enable = useEnableInvite(projectId);
  const rotate = useRotateInvite(projectId);
  const disable = useDisableInvite(projectId);

  const active = !!invite?.isActive;
  // FE tự ghép URL từ origin hiện tại (guard SSR).
  const url =
    invite && typeof window !== 'undefined'
      ? `${window.location.origin}/work/join/${invite.token}`
      : '';

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Đã copy link mời');
    } catch {
      toast.error('Không copy được, vui lòng copy thủ công');
    }
  };

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Link2 className="h-4 w-4 text-muted-foreground" /> Link mời tham gia
      </div>
      {active ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input value={url} readOnly aria-label="Link mời" className="flex-1 text-xs" />
            <Button size="sm" onClick={copy}>
              <Copy className="mr-1 h-3.5 w-3.5" /> Copy
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => rotate.mutate()}
              disabled={rotate.isPending}
            >
              <RefreshCw className="mr-1 h-3.5 w-3.5" /> Đổi link
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => disable.mutate()}
              disabled={disable.isPending}
            >
              Tắt link
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Ai có link (đã đăng nhập) đều gửi được yêu cầu tham gia — bạn duyệt bên dưới.
          </p>
        </div>
      ) : (
        <Button size="sm" onClick={() => enable.mutate()} disabled={enable.isPending}>
          <Link2 className="mr-1 h-3.5 w-3.5" /> Tạo link mời
        </Button>
      )}
    </div>
  );
}

/** Danh sách yêu cầu tham gia chờ duyệt — chỉ OWNER thấy. */
function JoinRequestsSection({ projectId }: { projectId: string }) {
  const { data: requests = [] } = useJoinRequests(projectId, true);
  const accept = useAcceptJoinRequest(projectId);
  const reject = useRejectJoinRequest(projectId);
  const pending = accept.isPending || reject.isPending;

  return (
    <div className="rounded-lg border border-border p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Yêu cầu chờ duyệt{requests.length > 0 ? ` (${requests.length})` : ''}
      </p>
      {requests.length === 0 ? (
        <p className="text-xs text-muted-foreground">Không có yêu cầu nào</p>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <div key={r.id} className="flex items-center gap-3">
              <Avatar
                src={r.avatarUrl ?? undefined}
                alt={r.displayName}
                fallback={r.displayName.charAt(0).toUpperCase()}
                className="h-8 w-8"
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.displayName}</span>
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-green-600"
                disabled={pending}
                onClick={() => accept.mutate(r.id)}
                aria-label={`Duyệt ${r.displayName}`}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-destructive"
                disabled={pending}
                onClick={() => reject.mutate(r.id)}
                aria-label={`Từ chối ${r.displayName}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
