'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, Link2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ErrorState } from '@/components/common/ErrorState';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog/AlertDialog';
import { Button } from '@/components/ui/button/Button';
import { Checkbox } from '@/components/ui/checkbox/Checkbox';
import { DatePicker } from '@/components/ui/datepicker/DatePicker';
import { Form, FormField } from '@/components/ui/form/Form';
import { Input } from '@/components/ui/input/Input';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import {
  useCreateShareLink,
  useRemoveShareLink,
  useUpdateShareLink,
} from '@/features/notes/hooks/use-mutations';
import { useShareLink } from '@/features/notes/hooks/use-query';
import { shareLinkFormSchema } from '@/features/notes/schemas';
import type { ShareLink, ShareLinkFormValues, UpdateShareLinkInput } from '@/features/notes/types';

function toFormValues(link: ShareLink): ShareLinkFormValues {
  return {
    password: '',
    expiresAt: link.expiresAt ?? '',
    includeSubpages: link.includeSubpages,
    allowIndexing: link.allowIndexing,
    showAuthors: link.showAuthors,
  };
}

/**
 * BE không bao giờ trả lại mật khẩu đã đặt, nên form không thể hiện "giá trị
 * hiện tại" — bỏ trống nghĩa là giữ nguyên. Xoá mật khẩu là hành động tường
 * minh riêng (checkbox `clearPassword`), gửi `password: null`. Các field còn
 * lại form luôn hiện đúng giá trị đang có nên gửi lại an toàn, không cần diff.
 */
function buildUpdateInput(
  values: ShareLinkFormValues,
  clearPassword: boolean,
): UpdateShareLinkInput {
  return {
    includeSubpages: values.includeSubpages,
    allowIndexing: values.allowIndexing,
    showAuthors: values.showAuthors,
    expiresAt: values.expiresAt === '' ? null : values.expiresAt,
    ...(clearPassword ? { password: null } : values.password ? { password: values.password } : {}),
  };
}

interface RevokeDialogProps {
  isPending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

function RevokeDialog({ isPending, onConfirm, onOpenChange, open }: RevokeDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !isPending && onOpenChange(nextOpen)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Thu hồi liên kết công khai?</AlertDialogTitle>
          <AlertDialogDescription>
            Ai đang giữ liên kết này sẽ không truy cập được nữa. Bạn có thể bật chia sẻ lại
            sau bằng một liên kết mới.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose
            render={<Button type="button" variant="ghost" size="sm" disabled={isPending}>Huỷ</Button>}
          />
          <Button type="button" variant="danger" size="sm" isLoading={isPending} onClick={onConfirm}>
            Xác nhận thu hồi
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ShareLinkForm({ link, pageId }: { link: ShareLink; pageId: string }) {
  const update = useUpdateShareLink();
  const remove = useRemoveShareLink();
  const [clearPassword, setClearPassword] = useState(false);
  const [isRevokeOpen, setRevokeOpen] = useState(false);
  const form = useForm<ShareLinkFormValues>({
    resolver: zodResolver(shareLinkFormSchema),
    defaultValues: toFormValues(link),
  });

  const publicUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/p/${link.token}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(publicUrl);
    toast.success('Đã chép liên kết');
  }

  function submit(values: ShareLinkFormValues) {
    update.mutate(
      { pageId, linkId: link.id, input: buildUpdateInput(values, clearPassword) },
      {
        onSuccess: () => {
          setClearPassword(false);
          form.setValue('password', '');
          toast.success('Đã lưu tuỳ chọn chia sẻ');
        },
      },
    );
  }

  function handleRevoke() {
    remove.mutate(
      { pageId, linkId: link.id },
      { onSuccess: () => { setRevokeOpen(false); toast.success('Đã thu hồi liên kết'); } },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2">
        <Link2 aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        <code className="min-w-0 flex-1 truncate text-xs">{publicUrl}</code>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Chép liên kết" onClick={handleCopy}>
          <Copy aria-hidden="true" className="size-4" />
        </Button>
      </div>

      <Form {...form}><form onSubmit={form.handleSubmit(submit)} className="space-y-3">
        <FormField control={form.control} name="password" render={({ field, fieldState }) => (
          <Input
            type="password"
            label="Mật khẩu"
            value={field.value}
            error={fieldState.error?.message}
            disabled={clearPassword}
            placeholder="Để trống nếu không đổi mật khẩu hiện có"
            onChange={(event) => field.onChange(event.target.value)}
          />
        )} />
        <Checkbox
          checked={clearPassword}
          onCheckedChange={(value) => setClearPassword(Boolean(value))}
          label="Xoá mật khẩu hiện có (nếu có)"
        />

        <FormField control={form.control} name="expiresAt" render={({ field, fieldState }) => (
          <DatePicker
            mode="single"
            editable
            label="Hạn dùng (bỏ trống = không giới hạn)"
            placeholder="dd/mm/yyyy"
            value={field.value ? new Date(field.value) : undefined}
            onChange={(date) => field.onChange(date instanceof Date ? date.toISOString() : '')}
            error={fieldState.error?.message}
          />
        )} />

        <FormField control={form.control} name="includeSubpages" render={({ field }) => (
          <Checkbox
            checked={field.value}
            onCheckedChange={(value) => field.onChange(Boolean(value))}
            label="Bao gồm cả trang con"
          />
        )} />
        <FormField control={form.control} name="allowIndexing" render={({ field }) => (
          <Checkbox
            checked={field.value}
            onCheckedChange={(value) => field.onChange(Boolean(value))}
            label="Cho công cụ tìm kiếm lập chỉ mục"
          />
        )} />
        <FormField control={form.control} name="showAuthors" render={({ field }) => (
          <Checkbox
            checked={field.value}
            onCheckedChange={(value) => field.onChange(Boolean(value))}
            label="Hiện tên người viết"
          />
        )} />

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button type="button" variant="danger-outline" size="sm" onClick={() => setRevokeOpen(true)}>
            Thu hồi liên kết
          </Button>
          <Button type="submit" size="sm" isLoading={update.isPending}>Lưu thay đổi</Button>
        </div>
      </form></Form>

      <RevokeDialog
        open={isRevokeOpen}
        isPending={remove.isPending}
        onOpenChange={setRevokeOpen}
        onConfirm={handleRevoke}
      />
    </div>
  );
}

function EnableShareForm({ pageId }: { pageId: string }) {
  const create = useCreateShareLink();
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Bật để tạo liên kết công khai — bất kỳ ai có liên kết đều xem được trang này mà
        không cần đăng nhập.
      </p>
      <Button
        type="button"
        size="sm"
        isLoading={create.isPending}
        onClick={() => create.mutate(
          { pageId, input: {} },
          { onSuccess: () => toast.success('Đã bật chia sẻ công khai') },
        )}
      >
        Bật chia sẻ công khai
      </Button>
    </div>
  );
}

function PublicShareSectionSkeleton() {
  return (
    <div data-testid="public-share-loading" className="space-y-2">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-2/3" />
    </div>
  );
}

interface PublicShareSectionProps {
  pageId: string;
}

export function PublicShareSection({ pageId }: PublicShareSectionProps) {
  const shareLinkQuery = useShareLink(pageId);

  let content: ReactNode;
  if (shareLinkQuery.isLoading) {
    content = <PublicShareSectionSkeleton />;
  } else if (shareLinkQuery.isError) {
    content = (
      <ErrorState
        size="sm"
        message="Không tải được liên kết chia sẻ"
        onRetry={() => void shareLinkQuery.refetch()}
      />
    );
  } else {
    const link = shareLinkQuery.data;
    content = link && !link.revokedAt
      ? <ShareLinkForm link={link} pageId={pageId} />
      : <EnableShareForm pageId={pageId} />;
  }

  return (
    <section aria-labelledby="public-sharing-title" className="space-y-4 border-t border-border p-4">
      <div>
        <h2 id="public-sharing-title" className="text-sm font-semibold text-foreground">Công khai</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Chia sẻ trang này bằng liên kết, không cần mời từng người.
        </p>
      </div>
      {content}
    </section>
  );
}
