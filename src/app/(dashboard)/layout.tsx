import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SidebarWrapper } from "@/components/layouts/sidebar-wrapper";
import { ClientProviders } from "@/components/providers/client-providers";
import { getCachedSession } from "@/lib/auth/require-auth";

/**
 * 대시보드 레이아웃
 * 인증된 사용자만 접근 가능한 페이지에 적용
 * 사이드바와 헤더를 포함한 메인 레이아웃
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 쿠키에서 사이드바 상태 읽기
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  // 세션에서 role 가져오기
  const session = await getCachedSession();

  // 미인증 사용자는 로그인으로 리다이렉트
  if (!session?.user) {
    redirect("/login");
  }

  // 조직 없는 사용자는 온보딩으로 리다이렉트
  if (!session.user.organizationId) {
    redirect("/onboarding");
  }

  const role = session.user.role ?? null;
  const user = {
    name: session.user.name ?? null,
    email: session.user.email ?? "",
  };

  return (
    <ClientProviders>
      <SidebarWrapper
        defaultOpen={defaultOpen}
        role={role as "ADMIN" | "MEMBER" | "VIEWER" | null}
        user={user}
      >
        {children}
      </SidebarWrapper>
    </ClientProviders>
  );
}
