// src/app/page.tsx
// 루트 페이지 - 인증 상태에 따라 적절한 페이지로 리다이렉트

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * 루트 페이지
 * - 미인증 → /login
 * - 조직 없음 → /onboarding
 * - 조직 있음 → /apps
 */
export default async function RootPage() {
  const session = await auth();

  // 미인증 사용자는 로그인 페이지로
  if (!session?.user) {
    redirect("/login");
  }

  // SUPER_ADMIN은 super-admin 페이지로
  if ((session.user.role as string) === "SUPER_ADMIN") {
    redirect("/super-admin");
  }

  // 조직이 없는 사용자는 온보딩 페이지로
  if (!session.user.organizationId) {
    redirect("/onboarding");
  }

  // 조직이 있는 사용자는 대시보드로
  redirect("/dashboard");
}
