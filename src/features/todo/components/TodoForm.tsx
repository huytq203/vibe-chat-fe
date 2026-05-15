'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form/Form';
import { createTodoAction } from '../actions';
import { createTodoSchema, type CreateTodoInput } from '../schemas';

type TodoFormProps = {
  onCreated?: () => void;
};

export function TodoForm({ onCreated }: TodoFormProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<CreateTodoInput>({
    resolver: zodResolver(createTodoSchema),
    defaultValues: { title: '' },
  });

  const handleSubmit = (values: CreateTodoInput) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createTodoAction(values);
      if (!result.success) {
        setServerError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success('Đã tạo todo');
      form.reset();
      onCreated?.();
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-3">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tiêu đề</FormLabel>
              <FormControl>
                <Input placeholder="Việc cần làm..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {serverError && (
          <p role="alert" className="text-sm text-destructive">
            {serverError}
          </p>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Đang lưu...' : 'Thêm'}
        </Button>
      </form>
    </Form>
  );
}
