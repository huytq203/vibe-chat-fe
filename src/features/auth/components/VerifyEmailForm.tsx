'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input/Input';
import { Button } from '@/components/ui/button/Button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card/Card';
import { useResendOtp, useVerifyEmail } from '@/features/auth/hooks/use-mutations';
import { ApiError } from '@/lib/api/client';

const RESEND_COOLDOWN = 60;

export const VerifyEmailForm = () => {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  const verify = useVerifyEmail();
  const resend = useResendOtp();

  // Đếm ngược 60s cho nút "Gửi lại mã" (disable ngay sau khi vào màn này).
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const handleVerify = async () => {
    if (!email.trim()) return toast.error('Vui lòng nhập email');
    if (!/^\d{6}$/.test(otp)) return toast.error('Mã gồm 6 chữ số');
    try {
      await verify.mutateAsync({ email: email.trim(), otp });
      toast.success('Xác thực email thành công! Hãy đăng nhập.');
      router.push('/login');
    } catch (e) {
      // BE trả message tiếng Việt theo từng code (sai/hết hạn/quá số lần) — hiển thị trực tiếp.
      toast.error(e instanceof ApiError ? e.message : 'Xác thực thất bại. Thử lại.');
    }
  };

  const handleResend = async () => {
    if (!email.trim()) return toast.error('Vui lòng nhập email');
    try {
      await resend.mutateAsync(email.trim());
      toast.success('Đã gửi mã mới tới email của bạn.');
      setCooldown(RESEND_COOLDOWN);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Không gửi được mã. Thử lại sau.');
      // 429 cooldown/quota → giữ nút disable thêm 1 chu kỳ.
      if (e instanceof ApiError && e.code === 'AUTH_OTP_RESEND_COOLDOWN') setCooldown(RESEND_COOLDOWN);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center pb-4 pt-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-2xl">Xác thực email</CardTitle>
        <CardDescription>Nhập mã 6 số đã gửi tới email của bạn</CardDescription>
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
        />
        <Input
          label="Mã OTP"
          inputMode="numeric"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="123456"
          className="text-center text-lg tracking-[0.4em]"
          onKeyDown={(e) => { if (e.key === 'Enter') void handleVerify(); }}
        />
        <Button
          type="button"
          className="w-full"
          isLoading={verify.isPending}
          disabled={verify.isPending}
          onClick={() => void handleVerify()}
        >
          Xác thực
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          Không nhận được mã?{' '}
          <Button
            variant="link"
            type="button"
            className="px-0"
            disabled={cooldown > 0 || resend.isPending}
            onClick={() => void handleResend()}
          >
            {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : 'Gửi lại mã'}
          </Button>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          <Button variant="link" type="button" className="px-0" onClick={() => router.push('/login')}>
            Quay lại đăng nhập
          </Button>
        </p>
      </CardContent>
    </Card>
  );
};
