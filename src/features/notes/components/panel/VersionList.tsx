'use client';

import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { History, Plus } from 'lucide-react';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Badge } from '@/components/ui/badge/Badge';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { ScrollArea } from '@/components/ui/scroll-area/ScrollArea';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import type { UserProfile } from '@/features/friends';
import { useCreateVersion } from '@/features/notes/hooks/use-mutations';
import { useVersions } from '@/features/notes/hooks/use-query';
import { useUserProfiles } from '@/features/notes/hooks/useUserProfiles';
import type { PageVersion } from '@/features/notes/types';
import { VersionViewer } from './VersionViewer';

const kindLabels: Record<PageVersion['kind'], string> = {
  AUTO: 'Tự động',
  MANUAL: 'Thủ công',
  BEFORE_RESTORE: 'Trước khi khôi phục',
  BEFORE_AI: 'Trước khi AI sửa',
};

interface VersionGroup {
  date: Date;
  key: string;
  versions: PageVersion[];
}

function formatDayLabel(date: Date): string {
  const label = format(date, "EEEE, 'ngày' d 'tháng' M, yyyy", { locale: vi });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function groupVersions(versions: PageVersion[]): VersionGroup[] {
  const groups = new Map<string, VersionGroup>();
  const sorted = [...versions].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  );
  for (const version of sorted) {
    const date = new Date(version.createdAt);
    const key = format(date, 'yyyy-MM-dd');
    const group = groups.get(key) ?? { date, key, versions: [] };
    group.versions.push(version);
    groups.set(key, group);
  }
  return Array.from(groups.values());
}

function VersionListSkeleton() {
  return (
    <div data-testid="version-list-loading" className="space-y-3 p-4">
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="space-y-2 rounded-md px-3 py-2">
          <div className="flex justify-between gap-3">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-3 w-3/5" />
        </div>
      ))}
    </div>
  );
}

function CreateVersionForm({ pageId }: { pageId: string }) {
  const createVersion = useCreateVersion();
  const [label, setLabel] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (createVersion.isPending) return;
    const trimmedLabel = label.trim();
    createVersion.mutate(
      { pageId, label: trimmedLabel || undefined },
      { onSuccess: () => {
        setLabel('');
        toast.success('Đã tạo mốc phiên bản');
      } },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 border-b border-border p-3">
      <Input
        aria-label="Nhãn mốc phiên bản"
        value={label}
        maxLength={100}
        placeholder="Nhãn không bắt buộc"
        disabled={createVersion.isPending}
        className="h-8 min-w-0 text-base sm:text-sm"
        onChange={(event) => setLabel(event.target.value)}
      />
      <Button type="submit" size="sm" isLoading={createVersion.isPending}>
        <Plus aria-hidden="true" className="size-4" />Tạo mốc
      </Button>
    </form>
  );
}

function VersionRow({ version, onSelect, profiles }: {
  version: PageVersion;
  onSelect: (versionId: string) => void;
  profiles: ReadonlyMap<string, UserProfile>;
}) {
  const createdAt = new Date(version.createdAt);
  const profile = profiles.get(version.createdBy);
  const creatorName = profile?.displayName?.trim()
    || profile?.username.trim()
    || 'Người dùng Halo';
  return (
    <li>
      <button
        type="button"
        aria-label={`Xem phiên bản lúc ${format(createdAt, 'HH:mm')}`}
        className="w-full min-w-0 rounded-md px-3 py-2 text-start outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onSelect(version.id)}
      >
        <span className="flex min-w-0 items-center justify-between gap-2">
          <time dateTime={version.createdAt} className="text-sm font-medium text-foreground">
            {format(createdAt, 'HH:mm')}
          </time>
          <Badge variant="outline" size="sm" className="shrink-0 text-muted-foreground">
            {kindLabels[version.kind]}
          </Badge>
        </span>
        {version.label && <span className="mt-1 block truncate text-sm text-foreground">{version.label}</span>}
        <span className="mt-1 block truncate text-xs text-muted-foreground">
          Người tạo: {creatorName}
        </span>
      </button>
    </li>
  );
}

function VersionGroups({ versions, onSelect, profiles }: {
  versions: PageVersion[];
  onSelect: (versionId: string) => void;
  profiles: ReadonlyMap<string, UserProfile>;
}) {
  const groups = useMemo(() => groupVersions(versions), [versions]);
  return (
    <div className="space-y-5 p-4">
      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`version-day-${group.key}`}>
          <h2 id={`version-day-${group.key}`} className="mb-1 px-3 text-xs font-semibold text-muted-foreground">
            {formatDayLabel(group.date)}
          </h2>
          <ul className="space-y-1">
            {group.versions.map((version) => <VersionRow key={version.id} version={version} onSelect={onSelect} profiles={profiles} />)}
          </ul>
        </section>
      ))}
    </div>
  );
}

interface VersionListProps {
  pageId: string;
}

export function VersionList({ pageId }: VersionListProps) {
  const versionsQuery = useVersions(pageId);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const profileIds = useMemo(
    () => [...new Set((versionsQuery.data ?? []).map((version) => version.createdBy))].sort(),
    [versionsQuery.data],
  );
  const profiles = useUserProfiles(profileIds);

  if (selectedVersionId) {
    return <VersionViewer versionId={selectedVersionId} onBack={() => setSelectedVersionId(null)} />;
  }

  let content: ReactNode;
  if (versionsQuery.isLoading) content = <VersionListSkeleton />;
  else if (versionsQuery.isError) {
    content = <ErrorState size="sm" message="Không tải được lịch sử phiên bản" onRetry={() => void versionsQuery.refetch()} />;
  } else if (!versionsQuery.data?.length) {
    content = <EmptyState icon={<History aria-hidden="true" />} title="Chưa có phiên bản nào" hint="Tạo một mốc để lưu trạng thái hiện tại." size="sm" />;
  } else {
    content = <VersionGroups versions={versionsQuery.data} onSelect={setSelectedVersionId} profiles={profiles} />;
  }

  return (
    <div className="flex h-full min-w-0 flex-col">
      <CreateVersionForm pageId={pageId} />
      <ScrollArea className="min-h-0 min-w-0 flex-1 overflow-x-hidden">{content}</ScrollArea>
    </div>
  );
}
