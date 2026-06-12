'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Lock } from 'lucide-react';
import { Form, FormField } from '@/components/ui/form/Form';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import { Checkbox } from '@/components/ui/checkbox/Checkbox';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card/Card';
import { toast } from 'sonner';
import { loginSchema, type LoginInput } from '@/features/auth/schemas';
import { useLogin } from '@/features/auth/hooks/use-mutations';
import { ApiError } from '@/lib/api/client';

export const LoginForm = () => {
  const router = useRouter();
  const login = useLogin();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '', rememberMe: false },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      await login.mutateAsync(data);
      toast.success('Đăng nhập thành công!');
      router.push('/chat');
    } catch (e) {
      // Chưa xác thực email → đưa về màn nhập OTP. Tiền điền email nếu user đăng nhập bằng email.
      if (e instanceof ApiError && e.code === 'AUTH_EMAIL_NOT_VERIFIED') {
        toast.error('Tài khoản chưa xác thực email. Vui lòng nhập mã OTP.');
        const emailHint = data.username.includes('@') ? data.username : '';
        router.push(`/verify-email?email=${encodeURIComponent(emailHint)}`);
        return;
      }
      toast.error(e instanceof ApiError ? e.message : 'Không thể đăng nhập. Thử lại sau.');
    }
  };

  return (
    <Card className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-500">
      <CardHeader className="text-center pb-4 pt-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-2xl">Chào mừng trở lại</CardTitle>
        <CardDescription>Đăng nhập vào Halo</CardDescription>
      </CardHeader>

      <CardContent className="px-6 pb-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field, fieldState }) => (
                <Input
                  label="Tên đăng nhập hoặc email"
                  placeholder="username hoặc email"
                  icon={<User className="w-4 h-4" />}
                  error={fieldState.error?.message}
                  autoComplete="username"
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
                  autoComplete="current-password"
                  {...field}
                />
              )}
            />

            <div className="flex items-center justify-between">
              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <Checkbox
                    label="Ghi nhớ đăng nhập"
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                )}
              />
              <Button variant="link" type="button">
                Quên mật khẩu?
              </Button>
            </div>

            <Button
              type="submit"
              className="w-full"
              isLoading={login.isPending}
              disabled={login.isPending}
            >
              Đăng nhập
            </Button>
          </form>
        </Form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Chưa có tài khoản?{' '}
          <Button
            variant="link"
            type="button"
            className="px-0"
            onClick={() => router.push('/register')}
          >
            Đăng ký ngay
          </Button>
        </p>
      </CardContent>
    </Card>
  );
};
