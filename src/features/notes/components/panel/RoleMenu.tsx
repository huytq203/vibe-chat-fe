'use client';

import { Check, ChevronDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu/DropdownMenu';
import { pageRoleHints, pageRoleLabels, pageRoleOrder } from '@/features/notes/lib/page-role';
import type { PageRole } from '@/features/notes/types';

interface RoleMenuProps {
  /** Tiền tố tên gọi cho trình đọc màn hình, vd "Vai trò của Nguyễn Văn A". */
  label: string;
  isPending?: boolean;
  onRemove?: () => void;
  onSelect: (role: PageRole) => void;
  removeText?: string;
  /** Chữ hiện trên nút thay cho nhãn vai trò — dùng cho hành động hàng loạt. */
  triggerText?: string;
  /** Vai trò đang chọn; bỏ trống khi nhóm đang chọn nhiều vai trò khác nhau. */
  value?: PageRole;
}

export function RoleMenu({
  label, isPending, onRemove, onSelect, removeText, triggerText, value,
}: RoleMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="xs"
            isLoading={isPending}
            aria-label={triggerText || !value ? label : `${label}: ${pageRoleLabels[value]}`}
            className="shrink-0 gap-1 px-2 text-muted-foreground hover:text-foreground data-popup-open:bg-accent data-popup-open:text-foreground"
          >
            {triggerText ?? (value && pageRoleLabels[value])}
            <ChevronDown aria-hidden="true" className="size-3.5" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-60">
        {pageRoleOrder.map((role) => (
          <DropdownMenuItem
            key={role}
            onClick={() => onSelect(role)}
            className="items-start gap-2 py-2"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-foreground">{pageRoleLabels[role]}</span>
              <span className="block text-xs text-muted-foreground">{pageRoleHints[role]}</span>
            </span>
            {role === value && <Check aria-hidden="true" className="mt-0.5 text-primary" />}
          </DropdownMenuItem>
        ))}
        {onRemove && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onRemove}
              className="text-danger focus:bg-danger/10 focus:text-danger"
            >
              <Trash2 aria-hidden="true" />
              {removeText ?? 'Gỡ quyền'}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
