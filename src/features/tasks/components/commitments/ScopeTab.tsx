'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge/Badge';
import { Button } from '@/components/ui/button/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog/Dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { ComboBox } from '@/components/ui/combobox/ComboBox';
import { Input } from '@/components/ui/input/Input';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { Textarea } from '@/components/ui/textarea/Textarea';
import {
  useAddScopeItem,
  useProjectScope,
  useRemoveScopeItem,
  useUpdateScopeDocument,
  useUpdateScopeItem,
} from '../../hooks/useScope';
import type { ScopeItem, ScopeItemStatus } from '../../types';
import { useProjectRole } from '../../hooks/useProjectRole';

const STATUS_LABELS: Record<ScopeItemStatus, string> = {
  APPROVED: 'Đã duyệt',
  PHASE_2: 'Giai đoạn 2',
  REMOVED: 'Đã gỡ',
};

const STATUS_BADGE_VARIANT: Record<
  ScopeItemStatus,
  'soft-success' | 'soft-warning' | 'secondary'
> = {
  APPROVED: 'soft-success',
  PHASE_2: 'soft-warning',
  REMOVED: 'secondary',
};

export function ScopeTab({ projectId }: { projectId: string }) {
  const scope = useProjectScope(projectId);
  const { canManage } = useProjectRole(projectId);

  if (scope.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (!scope.data) return null;

  return (
    <div className="space-y-6">
      <ScopeDocumentForm
        key={`${scope.data.version}:${scope.data.rawDocument ?? ''}`}
        projectId={projectId}
        rawDocument={scope.data.rawDocument}
        version={scope.data.version}
        canManage={canManage}
      />
      <ScopeItemList
        projectId={projectId}
        items={scope.data.items}
        version={scope.data.version}
        canManage={canManage}
      />
    </div>
  );
}

function ScopeDocumentForm({
  projectId,
  rawDocument,
  version,
  canManage,
}: {
  projectId: string;
  rawDocument: string | null;
  version: number;
  canManage: boolean;
}) {
  const [value, setValue] = useState(rawDocument ?? '');
  const update = useUpdateScopeDocument(projectId);

  return (
    <div className="space-y-2">
      <Textarea
        label="Tài liệu phạm vi (SOW/hợp đồng)"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={10}
        placeholder="Dán nội dung SOW hoặc mô tả phạm vi dự án..."
      />
      {canManage && (
        <Button
          size="sm"
          disabled={value === (rawDocument ?? '')}
          isLoading={update.isPending}
          onClick={() => update.mutate({ rawDocument: value, version })}
        >
          Lưu tài liệu
        </Button>
      )}
    </div>
  );
}

function ScopeItemList({
  projectId,
  items,
  version,
  canManage,
}: {
  projectId: string;
  items: ScopeItem[];
  version: number;
  canManage: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ScopeItem | null>(null);
  const [deleting, setDeleting] = useState<ScopeItem | null>(null);
  const removeItem = useRemoveScopeItem(projectId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Hạng mục phạm vi
        </h3>
        {canManage && (
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Thêm hạng mục
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Chưa có hạng mục phạm vi nào.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={
                      item.status === 'REMOVED'
                        ? 'font-medium text-muted-foreground line-through'
                        : 'font-medium text-foreground'
                    }
                  >
                    {item.title}
                  </span>
                  <Badge variant={STATUS_BADGE_VARIANT[item.status]} size="sm">
                    {STATUS_LABELS[item.status]}
                  </Badge>
                </div>
                {item.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </div>
              {canManage && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Sửa ${item.title}`}
                    onClick={() => setEditing(item)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Xoá ${item.title}`}
                    onClick={() => setDeleting(item)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <ScopeItemFormDialog
        projectId={projectId}
        version={version}
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="create"
      />
      {editing && (
        <ScopeItemFormDialog
          key={editing.id}
          projectId={projectId}
          version={version}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          mode="edit"
          item={editing}
        />
      )}

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá hạng mục phạm vi?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleting?.title}&quot; sẽ bị xoá (mềm) khỏi phạm vi dự án.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Huỷ
            </Button>
            <Button
              variant="danger"
              isLoading={removeItem.isPending}
              onClick={() => {
                if (!deleting) return;
                removeItem.mutate(
                  { itemId: deleting.id, version },
                  { onSuccess: () => setDeleting(null) },
                );
              }}
            >
              Xoá
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ScopeItemFormDialog({
  projectId,
  version,
  open,
  onOpenChange,
  mode,
  item,
}: {
  projectId: string;
  version: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  item?: ScopeItem;
}) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [status, setStatus] = useState<ScopeItemStatus>(
    item?.status ?? 'APPROVED',
  );
  const addItem = useAddScopeItem(projectId);
  const updateItem = useUpdateScopeItem(projectId);
  const pending = mode === 'create' ? addItem.isPending : updateItem.isPending;

  function reset() {
    setTitle('');
    setDescription('');
    setStatus('APPROVED');
  }

  function handleSubmit() {
    if (mode === 'create') {
      addItem.mutate(
        {
          title: title.trim(),
          ...(description.trim()
            ? { description: description.trim() }
            : {}),
          version,
        },
        {
          onSuccess: () => {
            reset();
            onOpenChange(false);
          },
        },
      );
    } else if (item) {
      updateItem.mutate(
        {
          itemId: item.id,
          input: {
            title: title.trim(),
            description: description.trim(),
            status,
            version,
          },
        },
        { onSuccess: () => onOpenChange(false) },
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen && mode === 'create') reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? 'Thêm hạng mục phạm vi'
              : 'Sửa hạng mục phạm vi'}
          </DialogTitle>
          <DialogDescription>
            Mô tả 1 hạng mục cụ thể trong phạm vi dự án.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            label="Tên hạng mục"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
          <Textarea
            label="Mô tả (không bắt buộc)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          {mode === 'edit' && (
            <ComboBox
              label="Trạng thái"
              value={status}
              options={[
                { value: 'APPROVED', label: 'Đã duyệt' },
                { value: 'PHASE_2', label: 'Giai đoạn 2' },
                { value: 'REMOVED', label: 'Đã gỡ' },
              ]}
              onValueChange={(value) =>
                setStatus(
                  (Array.isArray(value) ? value[0] : value) as ScopeItemStatus,
                )
              }
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim()}
            isLoading={pending}
          >
            {mode === 'create' ? 'Thêm' : 'Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
