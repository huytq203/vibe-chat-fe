'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { Search, UserMinus, UserPlus } from 'lucide-react';
import { useMembers, useAddMember, useRemoveMember } from '../../hooks/useMembers';
import { useUserSearch } from '../../hooks/useUserSearch';
import type { Project } from '../../types';

/** Độ trễ debounce nhỏ để tránh spam directory khi user đang gõ. */
const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export function ProjectSharingTab({ project }: { project: Project }) {
  const { data: members = [] } = useMembers(project.id);
  const addMember = useAddMember(project.id);
  const removeMember = useRemoveMember(project.id);

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
