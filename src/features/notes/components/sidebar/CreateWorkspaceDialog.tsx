'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog/Dialog';
import { Form, FormField } from '@/components/ui/form/Form';
import { Input } from '@/components/ui/input/Input';
import { useCreateWorkspace } from '@/features/notes/hooks/use-mutations';

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, 'Tên workspace không được để trống'),
});

type CreateWorkspaceValues = z.infer<typeof createWorkspaceSchema>;

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (workspaceId: string) => void;
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateWorkspaceDialogProps) {
  const createWorkspace = useCreateWorkspace();
  const form = useForm<CreateWorkspaceValues>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: { name: '' },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && !createWorkspace.isPending) form.reset();
    onOpenChange(nextOpen);
  }

  function handleSubmit(values: CreateWorkspaceValues) {
    createWorkspace.mutate(
      { name: values.name },
      {
        onSuccess: (workspace) => {
          toast.success('Đã tạo workspace');
          form.reset();
          onOpenChange(false);
          onCreated?.(workspace.id);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-border bg-sidebar">
        <DialogHeader>
          <DialogTitle>Tạo workspace mới</DialogTitle>
          <DialogDescription>
            Đặt tên cho không gian làm việc mới của bạn.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Input
                  label="Tên workspace"
                  placeholder="Ví dụ: Công việc"
                  error={fieldState.error?.message}
                  autoFocus
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  {...field}
                />
              )}
            />

            <Button
              type="submit"
              variant="ghost"
              isLoading={createWorkspace.isPending}
              className="border border-border bg-sidebar-accent text-foreground hover:bg-sidebar-accent"
            >
              Tạo workspace
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
