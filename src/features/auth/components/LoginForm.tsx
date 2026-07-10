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

// Style pill-shape hardcode theo Figma "Login Page Design - 2" (override có chủ
// đích cho riêng LoginForm — xem docs/superpowers/specs/2026-07-07-auth-showcase-layout-design.md).
const FIELD_CLASS =
  'h-[50px] rounded-full border-[#bcbec0] bg-white px-5 text-[#414042] placeholder:text-[#bcbec0] focus:border-[#0083b0]';
const LABEL_CLASS = 'text-sm text-[#414042]';

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
      <p className="text-2xl font-bold text-[#465685]">Halo</p>
      <h1 className="mt-1 text-[32px] font-bold leading-tight text-[#414042] lg:text-[38px]">
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
            className="h-auto p-0 text-xs text-[#465685]"
            onClick={() => router.push('/forgot-password')}
          >
            Quên mật khẩu?
          </Button>

          <Button
            type="submit"
            className="h-[50px] w-full rounded-full bg-[#a93159] text-lg font-bold text-white hover:bg-[#8f2749]"
            isLoading={login.isPending}
            disabled={login.isPending}
          >
            Đăng nhập
          </Button>
        </form>
      </Form>

      <div className="mt-6 flex flex-col items-center gap-4">
        <span className="text-sm text-[#798995]">Hoặc tiếp tục với</span>
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
                        className="h-[50px] w-[64px] rounded-full border-[#bcbec0] bg-white p-0 hover:bg-white"
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

      <p className="mt-6 text-center text-sm text-[#bcbec0]">
        Chưa có tài khoản?{' '}
        <Button
          variant="link"
          type="button"
          className="h-auto p-0 text-sm font-semibold text-[#465685]"
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
