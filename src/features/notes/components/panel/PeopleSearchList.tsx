'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Check, Search } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { Badge } from '@/components/ui/badge/Badge';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { useUserSearch } from '@/features/friends';
import type { DraftPerson } from '@/features/notes/hooks/usePermissionDraft';
import { cn } from '@/lib/utils/cn';

const SEARCH_LIMIT = 8;
const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 250;

interface PeopleSearchListProps {
  /** userId đã có quyền riêng trên trang → không cho chọn lại. */
  grantedIds: string[];
  onToggle: (person: DraftPerson) => void;
  selectedIds: string[];
}

function StateMessage({ children }: { children: ReactNode }) {
  return (
    <p className="flex h-full items-center justify-center px-6 text-center text-xs text-muted-foreground">
      {children}
    </p>
  );
}

export function PeopleSearchList({ grantedIds, onToggle, selectedIds }: PeopleSearchListProps) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const isActive = debounced.trim().length >= MIN_QUERY_LENGTH;
  const search = useUserSearch(debounced, SEARCH_LIMIT);
  const people = (search.data?.items ?? []).filter((item) => !item.isBot);

  return (
    <div className="space-y-2">
      <Input
        autoFocus
        value={query}
        autoComplete="off"
        aria-label="Tìm người để cấp quyền"
        placeholder="Tìm theo tên hoặc @username"
        icon={<Search aria-hidden="true" className="size-4" />}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div
        role="listbox"
        aria-label="Kết quả tìm người"
        className="h-56 overflow-y-auto rounded-lg border border-border bg-muted/30 p-1"
      >
        {!isActive && <StateMessage>Nhập tối thiểu 2 ký tự để tìm người trong Halo.</StateMessage>}
        {isActive && search.isLoading && (
          <div className="space-y-1 p-1">
            {[0, 1, 2].map((row) => <Skeleton key={row} className="h-11 w-full rounded-md" />)}
          </div>
        )}
        {isActive && search.isError && (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-xs text-danger">Không tìm được người dùng</p>
            <Button type="button" size="xs" variant="ghost" onClick={() => void search.refetch()}>
              Thử lại
            </Button>
          </div>
        )}
        {isActive && !search.isLoading && !search.isError && people.length === 0 && (
          <StateMessage>Không tìm thấy ai khớp «{debounced.trim()}».</StateMessage>
        )}
        {isActive && !search.isError && people.map((person) => {
          const name = person.displayName ?? person.username;
          const isGranted = grantedIds.includes(person.id);
          const isSelected = selectedIds.includes(person.id);
          return (
            <button
              key={person.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              disabled={isGranted}
              onClick={() => onToggle({
                avatarUrl: person.avatarUrl, id: person.id, name, username: person.username,
              })}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-start transition-colors',
                'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                  isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                )}
              >
                {isSelected && <Check className="size-3" />}
              </span>
              <Avatar size="sm" src={person.avatarUrl ?? undefined} alt={name} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-foreground">{name}</span>
                <span className="block truncate text-xs text-muted-foreground">@{person.username}</span>
              </span>
              {isGranted && (
                <Badge variant="outline" size="sm" className="shrink-0 text-muted-foreground">
                  Đã có quyền
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
