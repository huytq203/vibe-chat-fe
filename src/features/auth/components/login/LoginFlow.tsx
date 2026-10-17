'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton';
import { RestoreAccountDialog } from '@/features/auth/components/RestoreAccountDialog';
import {
  useCompleteSignup,
  useGoogleLogin,
  useRequestLoginCode,
  useVerifyLoginCode,
} from '@/features/auth/hooks/use-login-mutations';
import type { CompleteProfileInput } from '@/features/auth/schemas';
import type { HandoffParams, LoginOutcome } from '@/features/auth/types';
import { DownloadDesktopApp } from '@/features/app-update';
import { CodeStep } from './CodeStep';
import { CompleteProfileForm } from './CompleteProfileForm';
import { EmailStep } from './EmailStep';
import { HandoffDone } from './HandoffDone';
import { LoginCard } from './LoginCard';
import { StepHeading } from './StepHeading';
import { useLoginError } from './use-login-error';

type Step =
  | { kind: 'email' }
  | { kind: 'code'; email: string }
  | { kind: 'profile'; signupTicket: string; prefill: { email: string; displayName: string } }
  | { kind: 'handoff'; redirectUrl: string };

/** Đăng nhập web: Google hoặc mã email; email mới → hoàn tất hồ sơ; desktop → trả về app. */
export function LoginFlow({ handoff }: { handoff: HandoffParams | null }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: 'email' });
  const [lastEmail, setLastEmail] = useState('');
  const requestCode = useRequestLoginCode();
  const verify = useVerifyLoginCode();
  const google = useGoogleLogin();
  const signup = useCompleteSignup();
  const { restoreInfo, clearRestore, handleError } = useLoginError();

  const follow = (outcome: LoginOutcome): void => {
    if (outcome.status === 'AUTHENTICATED') router.push('/chat');
    else if (outcome.status === 'HANDOFF') setStep({ kind: 'handoff', redirectUrl: outcome.redirectUrl });
    else setStep({ kind: 'profile', signupTicket: outcome.signupTicket, prefill: outcome.prefill });
  };

  const run = async (action: () => Promise<LoginOutcome>): Promise<void> => {
    try {
      follow(await action());
    } catch (error) {
      handleError(error);
    }
  };

  const sendCode = async (email: string): Promise<void> => {
    try {
      await requestCode.mutateAsync(email);
      setLastEmail(email);
      setStep({ kind: 'code', email });
    } catch (error) {
      handleError(error);
    }
  };

  const submitProfile = (signupTicket: string, input: CompleteProfileInput): Promise<void> =>
    run(() =>
      signup.mutateAsync({
        signupTicket,
        username: input.username,
        displayName: input.displayName,
        dateOfBirth: input.dateOfBirth,
        ...(input.phone ? { phone: input.phone } : {}),
        handoff,
      }),
    );

  if (step.kind === 'handoff') return <HandoffDone redirectUrl={step.redirectUrl} />;

  return (
    <>
      <StepHeading step={step} handoff={handoff} />

      <LoginCard>
        {step.kind === 'email' && (
          <>
            <GoogleSignInButton
              disabled={google.isPending}
              onCredential={(idToken) => void run(() => google.mutateAsync({ idToken, handoff }))}
            />
            <div className="flex items-center gap-3 text-xs font-semibold tracking-wider text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              HOẶC
              <span className="h-px flex-1 bg-border" />
            </div>
            <EmailStep defaultEmail={lastEmail} isPending={requestCode.isPending} onSubmit={(email) => void sendCode(email)} />
            <p className="text-center text-xs text-muted-foreground">
              Tiếp tục nghĩa là bạn đồng ý với Điều khoản và Chính sách quyền riêng tư. Email mới sẽ tự tạo tài khoản.
            </p>
          </>
        )}
        {step.kind === 'code' && (
          <CodeStep
            isVerifying={verify.isPending}
            isResending={requestCode.isPending}
            onVerify={(code) => void run(() => verify.mutateAsync({ email: step.email, code, handoff }))}
            onResend={() => sendCode(step.email)}
            onChangeEmail={() => setStep({ kind: 'email' })}
          />
        )}
        {step.kind === 'profile' && (
          <CompleteProfileForm
            prefill={step.prefill}
            isPending={signup.isPending}
            onSubmit={(input) => void submitProfile(step.signupTicket, input)}
          />
        )}
      </LoginCard>

      {step.kind === 'email' && <DownloadDesktopApp />}

      {restoreInfo && (
        <RestoreAccountDialog
          open
          onOpenChange={(open) => {
            if (!open) clearRestore();
          }}
          restoreToken={restoreInfo.restoreToken}
          maskedEmail={restoreInfo.maskedEmail}
        />
      )}
    </>
  );
}
