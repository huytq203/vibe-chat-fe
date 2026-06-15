'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card/Card';
import {
  useForgotPassword,
  useResetPassword,
} from '@/features/auth/hooks/use-mutations';
import { ApiError } from '@/lib/api/client';

const RESEND_COOLDOWN = 60;

/** Quên mật khẩu: bước 1 nhập email nhận OTP, bước 2 nhập OTP + mật khẩu mới. */
export const ForgotPasswordForm = () => {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const forgot = useForgotPassword();
  const reset = useResetPassword();

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const sendOtp = async () => {
    if (!email.trim()) return toast.error('Vui lòng nhập email');
    try {
      await forgot.mutateAsync(email.trim());
      // BE luôn trả thông báo chung (chống dò email) — chuyển sang bước nhập mã.
      toast.success('Nếu email hợp lệ, mã đặt lại đã được gửi');
      setStep('reset');
      setCooldown(RESEND_COOLDOWN);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Không gửi được mã. Thử lại.');
      if (e instanceof ApiError && e.code === 'AUTH_OTP_RESEND_COOLDOWN') {
        setStep('reset');
        setCooldown(RESEND_COOLDOWN);
      }
    }
  };

  const submitReset = async () => {
    if (!/^\d{6}$/.test(otp)) return toast.error('Mã gồm 6 chữ số');
    if (newPassword.length < 6) return toast.error('Mật khẩu tối thiểu 6 ký tự');
    if (!/(?=.*[A-Z])(?=.*\d)/.test(newPassword))
      return toast.error('Mật khẩu phải có ít nhất 1 chữ hoa và 1 chữ số');
    try {
      await reset.mutateAsync({ email: email.trim(), otp, newPassword });
      toast.success('Đặt lại mật khẩu thành công! Hãy đăng nhập.');
      router.push('/login');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Đặt lại mật khẩu thất bại.');
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center pb-4 pt-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <KeyRound className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-2xl">Quên mật khẩu</CardTitle>
        <CardDescription>
          {step === 'email'
            ? 'Nhập email để nhận mã đặt lại mật khẩu'
            : 'Nhập mã OTP và mật khẩu mới'}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-8 space-y-4">
        <Input
          label="Email"
          type="email"
          icon={<Mail className="w-4 h-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          autoComplete="email"
          disabled={step === 'reset'}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && step === 'email') void sendOtp();
          }}
        />

        {step === 'email' ? (
          <Button
            type="button"
            className="w-full"
            isLoading={forgot.isPending}
            disabled={forgot.isPending}
            onClick={() => void sendOtp()}
          >
            Gửi mã đặt lại
          </Button>
        ) : (
          <>
            <Input
              label="Mã OTP"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="text-center text-lg tracking-[0.4em]"
            />
            <Input
              label="Mật khẩu mới"
              type="password"
              icon={<Lock className="w-4 h-4" />}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submitReset();
              }}
            />
            <Button
              type="button"
              className="w-full"
              isLoading={reset.isPending}
              disabled={reset.isPending}
              onClick={() => void submitReset()}
            >
              Đặt lại mật khẩu
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Không nhận được mã?{' '}
              <Button
                variant="link"
                type="button"
                className="px-0"
                disabled={cooldown > 0 || forgot.isPending}
                onClick={() => void sendOtp()}
              >
                {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : 'Gửi lại mã'}
              </Button>
            </div>
          </>
        )}

        <p className="text-center text-sm text-muted-foreground">
          <Button
            variant="link"
            type="button"
            className="px-0"
            onClick={() => router.push('/login')}
          >
            Quay lại đăng nhập
          </Button>
        </p>
      </CardContent>
    </Card>
  );
};
