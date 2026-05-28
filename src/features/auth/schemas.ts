import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(3, 'Tên đăng nhập tối thiểu 3 ký tự').max(100),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Tên đăng nhập 3–50 ký tự')
    .max(50)
    .regex(/^[a-z0-9_.-]+$/, 'Chỉ chữ thường, số, _ . -'),
  email: z.string().email('Email không hợp lệ'),
  password: z
    .string()
    .min(6, 'Mật khẩu tối thiểu 6 ký tự')
    .regex(/[A-Z]/, 'Cần ít nhất 1 chữ hoa')
    .regex(/\d/, 'Cần ít nhất 1 chữ số'),
  displayName: z.string().min(1).max(100).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export const updateMeSchema = z.object({
  displayName: z.string().min(1, 'Tên hiển thị không được để trống').max(100),
  gender: z.enum(['MALE', 'FEMALE']).nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
});

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
