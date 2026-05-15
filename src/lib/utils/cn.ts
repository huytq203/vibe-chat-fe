import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Hàm cn kết hợp giữa:
 * 1. clsx: Cho phép truyền class theo kiểu object, array, conditional (true/false)
 * 2. tailwind-merge: Đảm bảo các class Tailwind sau cùng sẽ ghi đè các class trước đó một cách chính xác
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}