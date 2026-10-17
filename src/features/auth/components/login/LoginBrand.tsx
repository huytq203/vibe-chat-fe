import { BrandMark } from '@/components/common/BrandMark';

/** Nhận diện đầu màn đăng nhập: logo + chữ Halo. Server Component. */
export function LoginBrand() {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark />
      <span className="text-2xl font-bold text-primary">Halo</span>
    </div>
  );
}
