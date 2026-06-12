import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(3, 'Tên đăng nhập tối thiểu 3 ký tự').max(100),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  rememberMe: z.boolean().optional(),
});

/** Đủ 13 tuổi tính tới hôm nay. */
function isAtLeast13(dob: string): boolean {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return false;
  const thirteenth = new Date(d.getFullYear() + 13, d.getMonth(), d.getDate());
  return thirteenth <= new Date();
}

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Tên đăng nhập 3–50 ký tự')
    .max(50)
    .regex(/^[a-z0-9_.-]+$/, 'Chỉ chữ thường, số, _ . -'),
  email: z.string().email('Email không hợp lệ'),
  password: z
    .string()
    .min(6, 'Mật khẩu 6–72 ký tự')
    .max(72, 'Mật khẩu 6–72 ký tự')
    .regex(/[A-Z]/, 'Cần ít nhất 1 chữ hoa')
    .regex(/\d/, 'Cần ít nhất 1 chữ số'),
  phone: z
    .string()
    .regex(/^\+?\d{10,20}$/, 'Số điện thoại 10–20 chữ số (cho phép + đầu)'),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày yyyy-mm-dd')
    .refine(isAtLeast13, 'Bạn phải đủ 13 tuổi'),
  displayName: z.string().min(1).max(100).optional(),
});

// Form đăng ký nhiều bước — mở rộng registerSchema với field chỉ dùng client-side
// (xác nhận mật khẩu, đồng ý điều khoản). Strip các field này trước khi gửi BE.
export const registerFormSchema = registerSchema
  .extend({
    displayName: z.string().min(2, 'Tên hiển thị tối thiểu 2 ký tự').max(100),
    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu'),
    agreeTerms: z.boolean().refine((v) => v, 'Bạn cần đồng ý điều khoản để tiếp tục'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Mật khẩu không khớp',
    path: ['confirmPassword'],
  });

export type RegisterFormInput = z.infer<typeof registerFormSchema>;

// Xác thực email bằng OTP 6 số (gửi dạng string, giữ số 0 đầu).
export const verifyEmailSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  otp: z.string().regex(/^\d{6}$/, 'Mã gồm 6 chữ số'),
});

export const resendOtpSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;

// PATCH /api/v1/users/me — tất cả optional (partial). Avatar/cover gửi mediaId (KHÔNG phải URL),
// gửi null để gỡ. Xem 24-profile.md.
export const updateMeSchema = z.object({
  displayName: z.string().min(1, 'Tên hiển thị không được để trống').max(100).optional(),
  bio: z.string().max(255, 'Giới thiệu tối đa 255 ký tự').nullable().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNDISCLOSED']).optional(),
  dateOfBirth: z.string().nullable().optional(),
  avatarMediaId: z.string().uuid().nullable().optional(),
  coverMediaId: z.string().uuid().nullable().optional(),
});

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
