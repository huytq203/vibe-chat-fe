'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Form } from '@/components/ui/form/Form';
import { Button } from '@/components/ui/button/Button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card/Card';
import { cn } from '@/lib/utils/cn';
import {
  registerFormSchema,
  type RegisterFormInput,
  type RegisterInput,
} from '@/features/auth/schemas';
import { useRegister } from '@/features/auth/hooks/use-mutations';
import { ApiError } from '@/lib/api/client';
import { StepProgress } from './register/StepProgress';
import { StepIdentity, StepContact, StepBirthday, StepSecurity } from './register/steps';

type StepField = keyof RegisterFormInput;

const STEPS: ReadonlyArray<{
  label: string;
  title: string;
  sub: string;
  fields: readonly StepField[];
}> = [
  {
    label: 'Danh tính',
    title: 'Tạo danh tính',
    sub: 'Tên hiển thị và tên đăng nhập của bạn trong Halo',
    fields: ['displayName', 'username'],
  },
  {
    label: 'Liên lạc',
    title: 'Thông tin liên lạc',
    sub: 'Email và số điện thoại để bảo vệ tài khoản',
    fields: ['email', 'phone'],
  },
  {
    label: 'Ngày sinh',
    title: 'Ngày sinh',
    sub: 'Xác minh bạn đủ tuổi sử dụng Halo (tối thiểu 13 tuổi)',
    fields: ['dateOfBirth'],
  },
  {
    label: 'Bảo mật',
    title: 'Đặt mật khẩu',
    sub: 'Tạo mật khẩu mạnh để bảo vệ tài khoản',
    fields: ['password', 'confirmPassword', 'agreeTerms'],
  },
];

const CONFLICT_FIELD: Record<string, StepField> = {
  USER_USERNAME_TAKEN: 'username',
  USER_EMAIL_TAKEN: 'email',
  USER_PHONE_TAKEN: 'phone',
};

function stepOfField(field: StepField): number {
  const idx = STEPS.findIndex((s) => s.fields.includes(field));
  return idx === -1 ? 0 : idx;
}

export const RegisterForm = () => {
  const router = useRouter();
  const register = useRegister();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd');
  const isLast = step === STEPS.length - 1;

  const form = useForm<RegisterFormInput>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      displayName: '',
      username: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      password: '',
      confirmPassword: '',
      agreeTerms: false,
    },
  });

  const goNext = async () => {
    const valid = await form.trigger(STEPS[step].fields, { shouldFocus: true });
    if (!valid) return;
    setDir('fwd');
    setStep((s) => s + 1);
  };

  const goBack = () => {
    setDir('back');
    setStep((s) => s - 1);
  };

  // Field lỗi từ BE (trùng username/email/...) có thể thuộc bước trước → nhảy về bước đó.
  const showFieldError = (field: StepField, message: string) => {
    form.setError(field, { message });
    const target = stepOfField(field);
    if (target !== step) {
      setDir('back');
      setStep(target);
    }
  };

  const onSubmit = async (data: RegisterFormInput) => {
    const payload: RegisterInput = {
      username: data.username,
      email: data.email,
      phone: data.phone,
      dateOfBirth: data.dateOfBirth,
      displayName: data.displayName,
      password: data.password,
    };
    try {
      const res = await register.mutateAsync(payload);
      toast.success('Đăng ký thành công! Nhập mã OTP gửi tới email của bạn.');
      router.push(`/verify-email?email=${encodeURIComponent(res.email)}`);
    } catch (e) {
      if (e instanceof ApiError) {
        const field = CONFLICT_FIELD[e.code];
        if (field) return showFieldError(field, e.message);
        if (e.code === 'VALIDATION_ERROR' && e.details && typeof e.details === 'object') {
          Object.entries(e.details as Record<string, string>).forEach(([k, msg]) =>
            showFieldError(k as StepField, String(msg)),
          );
          return;
        }
        return toast.error(e.message);
      }
      toast.error('Không thể đăng ký. Thử lại sau.');
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLast) void form.handleSubmit(onSubmit)(e);
    else void goNext();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-2 pt-8 text-center">
        <CardTitle className="text-2xl">Tạo tài khoản</CardTitle>
        <CardDescription>Tham gia Halo ngay hôm nay</CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-8 pt-2">
        <StepProgress labels={STEPS.map((s) => s.label)} current={step} />
        <Form {...form}>
          <form onSubmit={handleFormSubmit}>
            <div
              key={step}
              className={cn(dir === 'back' ? 'animate-step-in-back' : 'animate-step-in')}
            >
              <div className="mb-5">
                <h2 className="text-lg font-bold text-foreground">{STEPS[step].title}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{STEPS[step].sub}</p>
              </div>

              {step === 0 && <StepIdentity />}
              {step === 1 && <StepContact />}
              {step === 2 && <StepBirthday />}
              {step === 3 && <StepSecurity />}

              <div className="mt-6 flex gap-2.5">
                {step > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={goBack}
                    aria-label="Quay lại"
                    className="shrink-0 border border-border"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  type="submit"
                  className="flex-1"
                  isLoading={register.isPending}
                  disabled={register.isPending}
                  rightIcon={
                    isLast ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />
                  }
                >
                  {isLast ? 'Tạo tài khoản' : 'Tiếp theo'}
                </Button>
              </div>
            </div>
          </form>
        </Form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Đã có tài khoản?{' '}
          <Button variant="link" type="button" className="px-0" onClick={() => router.push('/login')}>
            Đăng nhập
          </Button>
        </p>
      </CardContent>
    </Card>
  );
};
