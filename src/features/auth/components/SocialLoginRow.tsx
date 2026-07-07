'use client';
import { Button } from '@/components/ui/button/Button';
import { Separator } from '@/components/ui/separator/Separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip/Tooltip';
import { GoogleIcon, FacebookIcon, GithubIcon } from '@/components/common/BrandIcons';

const PROVIDERS = [
  { key: 'google', label: 'Google', Icon: GoogleIcon },
  { key: 'facebook', label: 'Facebook', Icon: FacebookIcon },
  { key: 'github', label: 'GitHub', Icon: GithubIcon },
] as const;

/** Props for SocialLoginRow */
export interface SocialLoginRowProps {
  /** Nhãn hiển thị trên divider phía trên hàng icon */
  label?: string;
}

/**
 * Hàng nút đăng nhập nhanh Google/Facebook/GitHub — placeholder UI, disabled vì
 * backend chưa có OAuth. Tooltip báo "Sắp ra mắt" khi hover.
 */
export function SocialLoginRow({ label = 'Hoặc tiếp tục với' }: SocialLoginRowProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">{label}</span>
        <Separator className="flex-1" />
      </div>
      <TooltipProvider>
        <div className="flex justify-center gap-2">
          {PROVIDERS.map(({ key, label: providerLabel, Icon }) => (
            <Tooltip key={key}>
              {/*
                Nút bên trong bị `disabled` nên trình duyệt không bắn
                mouseenter/pointerenter lên chính nó → Tooltip hover sẽ
                không bao giờ mở. Bọc một `span` không-disabled làm
                TooltipTrigger thực sự (pattern chuẩn của Radix/Base UI).
              */}
              <TooltipTrigger
                render={
                  <span className="inline-flex">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled
                      aria-label={`Đăng nhập với ${providerLabel}`}
                    >
                      <Icon className="h-4 w-4" />
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
  );
}
