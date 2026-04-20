// src/lib/validation/password.ts
// 비밀번호 검증 스키마 (Zod)

import { z } from "zod";

/**
 * 비밀번호 검증 스키마
 * - 최소 8자
 * - 최대 72자 (bcrypt 제한)
 * - 대문자 포함
 * - 소문자 포함
 * - 숫자 포함
 * - 특수문자 포함
 */
export const passwordSchema = z
  .string()
  .min(8, "비밀번호는 8자 이상이어야 합니다")
  .max(72, "비밀번호는 72자 이하여야 합니다")
  .regex(/[A-Z]/, "비밀번호에 대문자를 포함해야 합니다")
  .regex(/[a-z]/, "비밀번호에 소문자를 포함해야 합니다")
  .regex(/[0-9]/, "비밀번호에 숫자를 포함해야 합니다")
  .regex(/[^A-Za-z0-9]/, "비밀번호에 특수문자를 포함해야 합니다");

/**
 * 비밀번호 검증 결과 타입
 */
export interface PasswordValidationResult {
  success: boolean;
  errors?: string[];
}

/**
 * 비밀번호를 검증하고 결과를 반환합니다.
 * @param password 검증할 비밀번호
 * @returns 검증 결과
 */
export function validatePassword(password: string): PasswordValidationResult {
  const result = passwordSchema.safeParse(password);

  if (result.success) {
    return { success: true };
  }

  return {
    success: false,
    errors: result.error.errors.map((e) => e.message),
  };
}
