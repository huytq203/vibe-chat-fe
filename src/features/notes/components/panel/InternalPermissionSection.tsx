'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Search, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar/Avatar';
import { Button } from '@/components/ui/button/Button';
import { ComboBox } from '@/components/ui/combobox/ComboBox';
import { Form, FormField } from '@/components/ui/form/Form';
import { Input } from '@/components/ui/input/Input';
import { useRemovePermission, useSetPermission } from '@/features/notes/hooks/use-mutations';
import { permissionFormSchema } from '@/features/notes/schemas';
import type { EffectivePagePermission, PermissionFormValues,
  WorkspaceMember } from '@/features/notes/types';
import { userKeys } from '@/services/keys';
import { usersApi } from '@/services/users.api';
import { pageRoleLabels, PermissionRow } from './PermissionRow';

const SEARCH_LIMIT = 8;
const roleOptions = Object.entries(pageRoleLabels).map(([value, label]) => ({ value, label }));

interface UserPickerProps {
  error?: string;
  onSelect: (userId: string) => void;
  selectedId: string;
}

function UserPicker({ error, onSelect, selectedId }: UserPickerProps) {
  const [query, setQuery] = useState('');
  const normalized = query.trim();
  const search = useQuery({ queryKey: userKeys.search(normalized, SEARCH_LIMIT),
    queryFn: () => usersApi.search({ q: normalized, limit: SEARCH_LIMIT }),
    enabled: normalized.length >= 2, staleTime: 15_000 });
  const items = search.data?.items.filter((item) => !item.isBot) ?? [];
  return (
    <div className="relative">
      <Input aria-label="Tìm người để cấp quyền" value={query} error={error}
        icon={<Search aria-hidden="true" className="size-4" />}
        placeholder="Tìm theo tên hoặc @username" autoComplete="off"
        onChange={(event) => { setQuery(event.target.value); onSelect(''); }} />
      {selectedId && <p className="mt-1 text-xs text-muted-foreground">Đã chọn người dùng</p>}
      {normalized.length >= 2 && (
        <ul role="listbox" aria-label="Kết quả tìm người"
          className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-background p-1 shadow-md">
          {search.isLoading && <li className="px-2 py-2 text-xs text-muted-foreground">Đang tìm…</li>}
          {search.isError && <li className="px-2 py-2 text-xs text-danger">Không tìm được người dùng</li>}
          {!search.isLoading && !search.isError && items.length === 0 && (
            <li className="px-2 py-2 text-xs text-muted-foreground">Không tìm thấy người dùng</li>
          )}
          {items.map((item) => (
            <li key={item.id}>
              <button type="button" role="option" aria-selected={selectedId === item.id}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-start hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => { onSelect(item.id); setQuery(item.displayName ?? `@${item.username}`); }}>
                <Avatar size="sm" src={item.avatarUrl ?? undefined}
                  alt={item.displayName ?? item.username} />
                <span className="min-w-0"><span className="block truncate text-sm text-foreground">{item.displayName ?? item.username}</span>
                  <span className="block truncate text-xs text-muted-foreground">@{item.username}</span></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PermissionForm({ pageId }: { pageId: string }) {
  const mutation = useSetPermission();
  const form = useForm<PermissionFormValues>({ resolver: zodResolver(permissionFormSchema),
    defaultValues: { subjectId: '', role: 'VIEW' } });
  const submit = (values: PermissionFormValues) => mutation.mutate(
    { pageId, input: { ...values, subjectType: 'USER' } },
    { onSuccess: () => { form.reset(); toast.success('Đã cập nhật quyền truy cập'); } },
  );
  return (
    <Form {...form}><form onSubmit={form.handleSubmit(submit)} className="space-y-2">
      <FormField control={form.control} name="subjectId" render={({ field, fieldState }) => (
        <UserPicker selectedId={field.value} error={fieldState.error?.message}
          onSelect={(value) => form.setValue('subjectId', value, { shouldValidate: true })} />
      )} />
      <div className="flex items-start gap-2">
        <FormField control={form.control} name="role" render={({ field }) => (
          <ComboBox options={roleOptions} value={field.value} autocomplete={false}
            clearIcon={false} aria-label="Vai trò trên trang" className="min-w-0 flex-1"
            onValueChange={(value) => typeof value === 'string' && field.onChange(value)} />
        )} />
        <Button type="submit" size="sm" isLoading={mutation.isPending}>
          <UserPlus aria-hidden="true" className="size-4" />Thêm
        </Button>
      </div>
    </form></Form>
  );
}

interface InternalPermissionSectionProps {
  members: WorkspaceMember[];
  pageId: string;
  permissions: EffectivePagePermission[];
}

export function InternalPermissionSection({ members, pageId,
  permissions }: InternalPermissionSectionProps) {
  const remove = useRemovePermission();
  const membersById = new Map(members.map((member) => [member.userId, member]));
  return (
    <section aria-labelledby="internal-sharing-title" className="space-y-4 p-4">
      <div><h2 id="internal-sharing-title" className="text-sm font-semibold text-foreground">Nội bộ</h2>
        <p className="mt-1 text-xs text-muted-foreground">Cấp quyền riêng cho người trong Halo.</p></div>
      <PermissionForm pageId={pageId} />
      {permissions.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">Chưa có quyền riêng nào trên trang này.</p>
      ) : (
        <ul className="divide-y divide-border">{permissions.map((entry) => (
          <PermissionRow key={entry.permission.id} entry={entry}
            member={membersById.get(entry.permission.subjectId)}
            isRemoving={remove.isPending && remove.variables?.permissionId === entry.permission.id}
            onRemove={(permissionId) => remove.mutate({ pageId, permissionId })} />
        ))}</ul>
      )}
    </section>
  );
}
