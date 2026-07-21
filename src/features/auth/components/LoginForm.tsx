'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField } from '@/components/ui/form/Form';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip/Tooltip';
import { toast } from 'sonner';
import { loginSchema, type LoginInput } from '@/features/auth/schemas';
import { useLogin } from '@/features/auth/hooks/use-mutations';
import { ApiError } from '@/lib/api/client';
import { RestoreAccountDialog } from './RestoreAccountDialog';
import { GoogleColorIcon, GithubColorIcon, FacebookColorIcon } from '@/components/common/BrandIcons';

type RestoreInfo = { restoreToken: string; maskedEmail: string | null };

const FIELD_CLASS =
  'h-[50px] rounded-full border-border bg-input px-5 text-foreground placeholder:text-muted-foreground focus:border-primary';
const LABEL_CLASS = 'text-sm text-foreground';

const SOCIAL_PROVIDERS = [
  { key: 'google', label: 'Google', Icon: GoogleColorIcon },
  { key: 'github', label: 'GitHub', Icon: GithubColorIcon },
  { key: 'facebook', label: 'Facebook', Icon: FacebookColorIcon },
] as const;

export const LoginForm = () => {
  const router = useRouter();
  const login = useLogin();
  const [restoreInfo, setRestoreInfo] = React.useState<RestoreInfo | null>(null);

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
      // Tài khoản đã xoá (còn trong 7 ngày) → mở luồng khôi phục bằng restoreToken.
      if (e instanceof ApiError && e.code === 'AUTH_ACCOUNT_DELETED') {
        const d = e.details as
          | { restoreToken?: string; email?: string | null }
          | undefined;
        if (d?.restoreToken) {
          setRestoreInfo({
            restoreToken: d.restoreToken,
            maskedEmail: d.email ?? null,
          });
          return;
        }
      }
      toast.error(e instanceof ApiError ? e.message : 'Không thể đăng nhập. Thử lại sau.');
    }
  };

  return (
    <div className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-500">
      <p className="text-2xl font-bold text-primary">Halo</p>
      <h1 className="mt-1 text-[32px] font-bold leading-tight text-foreground lg:text-[38px]">
        Đăng nhập
      </h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field, fieldState }) => (
              <div className="space-y-1.5">
                <label htmlFor="login-username" className={LABEL_CLASS}>
                  Email
                </label>
                <Input
                  id="login-username"
                  placeholder="username@gmail.com"
                  error={fieldState.error?.message}
                  autoComplete="username"
                  className={FIELD_CLASS}
                  {...field}
                />
              </div>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <div className="space-y-1.5">
                <label htmlFor="login-password" className={LABEL_CLASS}>
                  Mật khẩu
                </label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Mật khẩu"
                  error={fieldState.error?.message}
                  autoComplete="current-password"
                  className={FIELD_CLASS}
                  {...field}
                />
              </div>
            )}
          />

          <Button
            variant="link"
            type="button"
            className="h-auto p-0 text-xs text-primary"
            onClick={() => router.push('/forgot-password')}
          >
            Quên mật khẩu?
          </Button>

          <Button
            type="submit"
            className="h-[50px] w-full rounded-full text-lg font-bold"
            isLoading={login.isPending}
            disabled={login.isPending}
          >
            Đăng nhập
          </Button>
        </form>
      </Form>

      <div className="mt-6 flex flex-col items-center gap-4">
        <span className="text-sm text-muted-foreground">Hoặc tiếp tục với</span>
        <TooltipProvider>
          <div className="flex gap-3">
            {SOCIAL_PROVIDERS.map(({ key, label, Icon }) => (
              <Tooltip key={key}>
                {/* Bọc span không-disabled làm trigger thực sự — nút bên trong
                    disabled nên không bắn pointerenter (xem SocialLoginRow). */}
                <TooltipTrigger
                  render={
                    <span className="inline-flex">
                      <Button
                        type="button"
                        variant="outline"
                        disabled
                        aria-label={`Đăng nhập với ${label}`}
                        className="h-[50px] w-[64px] rounded-full border-border bg-background p-0 hover:bg-background"
                      >
                        <Icon className="h-6 w-6" />
                      </Button>
                    </span>
                  }
                />
                <TooltipContent>Sắp ra mắt</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Chưa có tài khoản?{' '}
        <Button
          variant="link"
          type="button"
          className="h-auto p-0 text-sm font-semibold text-primary"
          onClick={() => router.push('/register')}
        >
          Đăng ký ngay
        </Button>
      </p>

      {restoreInfo && (
        <RestoreAccountDialog
          open={!!restoreInfo}
          onOpenChange={(o) => {
            if (!o) setRestoreInfo(null);
          }}
          restoreToken={restoreInfo.restoreToken}
          maskedEmail={restoreInfo.maskedEmail}
        />
      )}
    </div>
  );
};
