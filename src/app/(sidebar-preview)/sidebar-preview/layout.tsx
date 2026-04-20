/**
 * 사이드바 프리뷰 레이아웃 (인증 불필요)
 * URL: /sidebar-preview
 * 로컬에서 사이드바 메뉴 구조 확인 전용
 */
import { SidebarWrapper } from "@/components/layouts/sidebar-wrapper";

export default function SidebarPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarWrapper
      defaultOpen={true}
      role="ADMIN"
      user={{ name: "Preview", email: "preview@example.com" }}
    >
      {children}
    </SidebarWrapper>
  );
}
