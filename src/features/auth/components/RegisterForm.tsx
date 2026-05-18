'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, User, Lock, UserCircle } from 'lucide-react';
import { Form, FormField } from '@/components/ui/form/Form';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card/Card';
import { toast } from 'sonner';
import { registerSchema, type RegisterInput } from '../schemas';
import { useRegister } from '../hooks/use-mutations';
import { ApiError } from '@/lib/api/client';

export const RegisterForm = () => {
  const router = useRouter();
  const register = useRegister();

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', email: '', password: '', displayName: '' },
  });

  const onSubmit = async (data: RegisterInput) => {
    try {
      await register.mutateAsync(data);
      toast.success('Đăng ký thành công!');
      router.push('/chat');
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : 'Không thể đăng ký. Thử lại sau.';
      toast.error(msg);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center pb-4 pt-8">
        <CardTitle className="text-2xl">Tạo tài khoản</CardTitle>
        <CardDescription>Tham gia Vibe Chat ngay hôm nay</CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="username"
              render={({ field, fieldState }) => (
                <Input
                  label="Tên đăng nhập"
                  placeholder="john_doe"
                  icon={<User className="w-4 h-4" />}
                  error={fieldState.error?.message}
                  {...field}
                />
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Input
                  label="Email"
                  type="email"
                  placeholder="email@example.com"
                  icon={<Mail className="w-4 h-4" />}
                  error={fieldState.error?.message}
                  {...field}
                />
              )}
            />
            <FormField
              control={form.control}
              name="displayName"
              render={({ field, fieldState }) => (
                <Input
                  label="Tên hiển thị"
                  placeholder="John Doe"
                  icon={<UserCircle className="w-4 h-4" />}
                  error={fieldState.error?.message}
                  {...field}
                />
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <Input
                  label="Mật khẩu"
                  type="password"
                  placeholder="••••••••"
                  icon={<Lock className="w-4 h-4" />}
                  error={fieldState.error?.message}
                  {...field}
                />
              )}
            />

            <Button
              type="submit"
              className="w-full"
              isLoading={register.isPending}
              disabled={register.isPending}
            >
              Đăng ký
            </Button>
          </form>
        </Form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Đã có tài khoản?{' '}
          <Button
            variant="link"
            type="button"
            className="px-0"
            onClick={() => router.push('/login')}
          >
            Đăng nhập
          </Button>
        </p>
      </CardContent>
    </Card>
  );
};
