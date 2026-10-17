import Image from 'next/image';
import { cn } from '@/lib/utils/cn';

interface BrandMarkProps {
  className?: string;
}

/**
 * Logo Halo (cáo vòng hào quang), render hoàn toàn ở server. Nét logo là tím sẫm nên ở theme
 * tối cần đảo độ sáng: việc đó do token `--brand-mark-filter` của theme quyết định
 * (`buildThemeCss`), không cần đọc theme ở client. `applyTheme` không bật class `.dark`
 * nên không dùng biến thể `dark:`.
 */
export function BrandMark({ className }: BrandMarkProps) {
  return (
    <Image
      src="/asset/logo/logo4-mark.png"
      alt=""
      width={46}
      height={46}
      className={cn('size-11 shrink-0 object-contain [filter:var(--brand-mark-filter)]', className)}
    />
  );
}
