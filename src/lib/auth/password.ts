// src/lib/auth/password.ts
// 비밀번호 해싱 유틸리티 (bcryptjs - 순수 JS 구현)

import * as bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * 비밀번호를 해시합니다.
 * @param password 평문 비밀번호
 * @returns 해시된 비밀번호
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 비밀번호가 해시와 일치하는지 검증합니다.
 * @param password 평문 비밀번호
 * @param hash 저장된 해시
 * @returns 일치 여부
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }
  return bcrypt.compare(password, hash);
}
