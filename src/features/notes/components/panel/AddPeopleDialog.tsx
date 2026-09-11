'use client';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog/Dialog';
import { useGrantPermissions } from '@/features/notes/hooks/use-mutations';
import { usePermissionDraft } from '@/features/notes/hooks/usePermissionDraft';
import { PeopleDraftList } from './PeopleDraftList';
import { PeopleSearchList } from './PeopleSearchList';

interface AddPeopleDialogProps {
  /** userId đã có quyền riêng trên trang → không cho chọn lại. */
  grantedIds: string[];
  onOpenChange: (open: boolean) => void;
  open: boolean;
  pageId: string;
}

export function AddPeopleDialog({ grantedIds, onOpenChange, open, pageId }: AddPeopleDialogProps) {
  const draft = usePermissionDraft();
  const grant = useGrantPermissions();
  const total = draft.grants.length;

  const submit = () => {
    if (total === 0) return;
    grant.mutate(
      { pageId, grants: draft.grants.map(({ id, role }) => ({ role, subjectId: id })) },
      {
        onSuccess: ({ failedIds, granted }) => {
          if (failedIds.length > 0) {
            // Giữ lại người lỗi trong danh sách để thử lại, không bắt chọn lại từ đầu.
            draft.keepOnly(failedIds);
            toast.error(`Đã cấp quyền cho ${granted} người, ${failedIds.length} người chưa xong`);
            return;
          }
          toast.success(`Đã cấp quyền cho ${granted} người`);
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent mobileContentClassName="max-md:px-0 max-md:pt-0 max-md:pb-[var(--f7-safe-area-bottom)]" className="flex max-h-[85vh] w-[calc(100%-2rem)] max-w-md flex-col gap-0 p-0">
        <DialogHeader className="px-5 pb-3 pe-12 pt-5 text-start">
          <DialogTitle className="text-base">Thêm người vào trang</DialogTitle>
          <DialogDescription className="text-xs">
            Chọn nhiều người một lượt, mỗi người một vai trò riêng.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
          <PeopleSearchList
            grantedIds={grantedIds}
            selectedIds={draft.grants.map((item) => item.id)}
            onToggle={draft.toggle}
          />
          {total > 0 && (
            <PeopleDraftList
              grants={draft.grants}
              onRemove={draft.remove}
              onRoleChange={draft.setRole}
              onRoleForAll={draft.setRoleForAll}
            />
          )}
        </div>

        <DialogFooter className="border-t border-border px-5 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={grant.isPending}
            onClick={() => onOpenChange(false)}
          >
            Huỷ
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={total === 0}
            isLoading={grant.isPending}
            onClick={submit}
          >
            Cấp quyền{total > 0 ? ` (${total})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
