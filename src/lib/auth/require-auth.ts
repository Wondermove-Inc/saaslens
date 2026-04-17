// src/lib/auth/require-auth.ts
/**
 * Server Action에서 인증 및 조직 확인 헬퍼
 * - 세션이 없으면 /login으로 리다이렉트
 * - 조직이 없으면 /onboarding으로 리다이렉트
 */

import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./index";

// 세션 조회는 여러 곳에서 반복 호출되므로 cache로 동일 요청 내 중복 호출을 방지
export const getCachedSession = cache(async () => auth());

/**
 * 인증된 사용자 + 조직 필수
 * @returns 세션 (organizationId 보장)
 */
export async function requireOrganization() {
  const session = await getCachedSession();

  // 세션이 없으면 로그인으로
  if (!session?.user) {
    redirect("/login");
  }

  // 조직이 없으면 온보딩으로
  if (!session.user.organizationId) {
    redirect("/onboarding");
  }

  return {
    session,
    organizationId: session.user.organizationId,
    userId: session.user.id,
    role: session.user.role as TenantRole,
    teamId: session.user.teamId ?? null,
  };
}

/**
 * 인증된 사용자만 필요 (조직은 선택)
 * @returns 세션
 */
export async function requireAuth() {
  const session = await getCachedSession();

  if (!session?.user) {
    redirect("/login");
  }

  return session;
}

// 기존 UserRole 타입 유지 (하위 호환성)
export type UserRole = "ADMIN" | "MEMBER" | "VIEWER";
export type TenantRole = "ADMIN" | "MEMBER" | "VIEWER";

/**
 * 특정 역할 필수
 * @param allowedRoles 허용된 역할 목록
 * @param redirectTo 권한 없을 때 리다이렉트 경로 (기본: /settings)
 * @returns 세션 (organizationId, role 보장)
 */
export async function requireRole(
  allowedRoles: TenantRole | TenantRole[],
  redirectTo: string = "/settings"
) {
  const { session, organizationId, userId, role } = await requireOrganization();

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!roles.includes(role as TenantRole)) {
    redirect(redirectTo);
  }

  return {
    session,
    organizationId,
    userId,
    role: role as TenantRole,
  };
}

/**
 * Admin 권한 필수
 * @param redirectTo 권한 없을 때 리다이렉트 경로 (기본: /settings)
 */
export async function requireAdmin(
  redirectTo: string = "/settings"
): Promise<ReturnType<typeof requireRole>> {
  return requireRole("ADMIN", redirectTo);
}

/**
 * Super Admin 권한 필수 (organizationId 없어도 됨)
 * @returns 세션 (userId, role 보장)
 */
export async function requireSuperAdmin() {
  const session = await getCachedSession();

  if (!session?.user) {
    redirect("/login");
  }

  // UserRole enum에 SUPER_ADMIN이 추가됨 (prisma/schema.prisma 참조)
  if ((session.user.role as string) !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return {
    session,
    userId: session.user.id,
    role: "SUPER_ADMIN" as const,
  };
}
