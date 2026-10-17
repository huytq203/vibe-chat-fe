import type { HandoffParams } from '@/features/auth/types';
import { LoginHeading } from './LoginHeading';
import { MailIcon } from './StatusIcons';

export type LoginStepKind =
  | { kind: 'email' }
  | { kind: 'code'; email: string }
  | { kind: 'profile'; prefill: { email: string } };

const strong = (text: string) => <b className="break-words font-semibold text-foreground">{text}</b>;

/** Tiêu đề, mô tả và icon theo từng bước đăng nhập. */
export function StepHeading({ step, handoff }: { step: LoginStepKind; handoff: HandoffParams | null }) {
  if (step.kind === 'code') {
    return (
      <LoginHeading
        size="step"
        icon={<MailIcon />}
        title="Nhập mã 6 số"
        description={<>Mã đã gửi tới {strong(step.email)}. Có hiệu lực trong 10 phút.</>}
      />
    );
  }
  if (step.kind === 'profile') {
    return (
      <LoginHeading
        size="step"
        title="Hoàn tất hồ sơ"
        description={<>Tài khoản mới cho {strong(step.prefill.email)}. Điền vài thông tin để bắt đầu.</>}
      />
    );
  }
  return (
    <LoginHeading
      title="Nhắn tin, làm việc, ghi chú. Một nơi."
      description={
        handoff
          ? 'Đăng nhập cho ứng dụng Halo trên máy tính bằng Google hoặc mã email.'
          : 'Đăng nhập bằng Google hoặc mã email. Không cần mật khẩu.'
      }
    />
  );
}
