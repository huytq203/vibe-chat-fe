'use client';

import { Mail } from 'lucide-react';
import { GoogleColorIcon } from '@/components/common/BrandIcons';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { useIdentities } from '@/features/auth';
import { SettingsSection } from './SettingsSection';

const LABELS = { GOOGLE: 'Google', EMAIL: 'Mã qua email' } as const;

/** Halo không dùng mật khẩu — hiển thị các cách user có thể đăng nhập. */
export function LoginMethodsSection() {
  const { data, isPending, isError } = useIdentities();

  return (
    <SettingsSection title="Phương thức đăng nhập" desc="Halo không dùng mật khẩu.">
      {isPending && <Skeleton className="h-14 w-full rounded-lg" />}
      {isError && <p className="text-[13px] text-danger">Không tải được phương thức đăng nhập.</p>}
      {data?.length === 0 && <p className="text-[13px] text-muted-foreground">Chưa có phương thức nào.</p>}
      {data && data.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {data.map((identity) => (
            <li key={identity.provider} className="flex items-center gap-3 px-3 py-2.5">
              {identity.provider === 'GOOGLE' ? (
                <GoogleColorIcon className="h-5 w-5" />
              ) : (
                <Mail className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-foreground">{LABELS[identity.provider]}</p>
                <p className="truncate text-[12px] text-muted-foreground">{identity.email}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SettingsSection>
  );
}
