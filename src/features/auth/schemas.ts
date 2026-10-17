import { z } from 'zod';

/** Đủ 13 tuổi tính tới hôm nay. */
function isAtLeast13(dob: string): boolean {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return false;
  const thirteenth = new Date(d.getFullYear() + 13, d.getMonth(), d.getDate());
  return thirteenth <= new Date();
}

// PATCH /api/v1/users/me — tất cả optional (partial). Avatar/cover gửi mediaId (KHÔNG phải URL),
// gửi null để gỡ. Xem 24-profile.md.
export const updateMeSchema = z.object({
  displayName: z.string().min(1, 'Tên hiển thị không được để trống').max(100).optional(),
  bio: z.string().max(255, 'Giới thiệu tối đa 255 ký tự').nullable().optional(),
  // 8–15 chữ số, có thể tiền tố +. Cho phép rỗng (chuyển thành null để xoá) và null.
  phone: z
    .string()
    .regex(/^\+?[0-9]{8,15}$/, 'Số điện thoại không hợp lệ')
    .nullable()
    .optional()
    .or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNDISCLOSED']).optional(),
  dateOfBirth: z.string().nullable().optional(),
  avatarMediaId: z.string().uuid().nullable().optional(),
  coverMediaId: z.string().uuid().nullable().optional(),
  // Chế độ hiển thị hồ sơ (xem 30-profile-visibility.md).
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
});

export type UpdateMeInput = z.infer<typeof updateMeSchema>;

// ── Đăng nhập không mật khẩu ───────────────────────────────────────────────
export const requestCodeSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email không hợp lệ'),
});

export const verifyCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Mã gồm đúng 6 chữ số'),
});

export const completeProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Tên đăng nhập 3–50 ký tự')
    .max(50, 'Tên đăng nhập 3–50 ký tự')
    .regex(/^[a-z0-9_.-]+$/, 'Chỉ chữ thường, số, _ . -'),
  displayName: z.string().trim().min(1, 'Tên hiển thị không được để trống').max(100),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Chọn ngày sinh')
    .refine(isAtLeast13, 'Bạn phải đủ 13 tuổi'),
  // Tuỳ chọn: chuỗi rỗng = không nhập.
  phone: z
    .string()
    .trim()
    .regex(/^(\+?\d{10,20})?$/, 'Số điện thoại 10–20 chữ số (cho phép + đầu)'),
});

export type RequestCodeInput = z.infer<typeof requestCodeSchema>;
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;
export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
