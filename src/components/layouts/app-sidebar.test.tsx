// src/components/layouts/app-sidebar.test.tsx
import { SidebarProvider } from "@/components/ui/sidebar";
import messages from "@/i18n/messages/ko.json";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppSidebar } from "./app-sidebar";

// Mock next-auth (prevent env.js import error)
vi.mock("next-auth", () => ({
  __esModule: true,
  default: () => ({}),
}));

// Mock @/actions/auth to prevent next-auth import chain
vi.mock("@/actions/auth", () => ({
  logout: vi.fn(),
}));

// Mock usePathname
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/dashboard"),
}));

// Mock useIsMobile
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="ko" messages={messages}>
      <SidebarProvider>{ui}</SidebarProvider>
    </NextIntlClientProvider>
  );
};

describe("AppSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("렌더링", () => {
    it("사이드바가 렌더링되어야 한다", () => {
      renderWithProvider(<AppSidebar />);
      // shadcn/ui Sidebar는 data-slot="sidebar"로 식별
      expect(screen.getByTestId("app-sidebar")).toBeInTheDocument();
    });

    it("브랜드명이 표시되어야 한다", () => {
      renderWithProvider(<AppSidebar />);
      expect(screen.getByText("SaaS Platform")).toBeInTheDocument();
    });
  });

  describe("메뉴 항목", () => {
    it("대시보드 메뉴가 표시되어야 한다", () => {
      renderWithProvider(<AppSidebar />);
      // 대시보드는 그룹 라벨과 메뉴 아이템 모두에 있음
      expect(screen.getAllByText("대시보드").length).toBeGreaterThanOrEqual(1);
    });

    it("관리 그룹 메뉴들이 표시되어야 한다", () => {
      renderWithProvider(<AppSidebar />);
      expect(screen.getByText("조직 관리")).toBeInTheDocument();
      expect(screen.getByText("구독")).toBeInTheDocument();
      expect(screen.getByText("결제")).toBeInTheDocument();
      expect(screen.getByText("확장 프로그램")).toBeInTheDocument();
    });

    it("대시보드 그룹에서 리포트 메뉴가 표시되어야 한다", () => {
      renderWithProvider(<AppSidebar />);
      expect(screen.getByText("리포트")).toBeInTheDocument();
    });

    it("시스템 그룹 메뉴들이 표시되어야 한다", () => {
      renderWithProvider(<AppSidebar />);
      expect(screen.getByText("연동")).toBeInTheDocument();
      expect(screen.getByText("설정")).toBeInTheDocument();
    });
  });

  describe("그룹 라벨", () => {
    it("대시보드 그룹 라벨이 표시되어야 한다", () => {
      renderWithProvider(<AppSidebar />);
      // "대시보드" 텍스트가 그룹 라벨과 메뉴 아이템 모두에 있음
      expect(screen.getAllByText("대시보드").length).toBeGreaterThanOrEqual(1);
    });

    it("관리 그룹 라벨이 표시되어야 한다", () => {
      renderWithProvider(<AppSidebar />);
      expect(screen.getByText("관리")).toBeInTheDocument();
    });

    it("시스템 그룹 라벨이 표시되어야 한다", () => {
      renderWithProvider(<AppSidebar />);
      expect(screen.getByText("시스템")).toBeInTheDocument();
    });
  });

  describe("네비게이션 링크", () => {
    it("직접 링크 메뉴 항목이 올바른 href를 가져야 한다", () => {
      renderWithProvider(<AppSidebar />);

      // 서브메뉴가 없는 직접 링크들
      expect(screen.getByRole("link", { name: /연동/ })).toHaveAttribute(
        "href",
        "/integrations"
      );
      expect(screen.getByRole("link", { name: /설정/ })).toHaveAttribute(
        "href",
        "/settings"
      );
    });

    it("모든 메뉴 항목이 링크로 렌더링된다", () => {
      renderWithProvider(<AppSidebar />);

      // 모든 메뉴가 서브메뉴 없이 단일 링크로 렌더링됨
      expect(screen.getByRole("link", { name: /리포트/ })).toHaveAttribute(
        "href",
        "/reports"
      );
      expect(screen.getByRole("link", { name: /조직 관리/ })).toHaveAttribute(
        "href",
        "/teams"
      );
      expect(screen.getByRole("link", { name: /결제/ })).toHaveAttribute(
        "href",
        "/payments"
      );
    });
  });

  describe("활성 상태", () => {
    it("연동 경로에서 연동 메뉴가 활성 상태여야 한다", async () => {
      const { usePathname } = await import("next/navigation");
      vi.mocked(usePathname).mockReturnValue("/integrations");

      renderWithProvider(<AppSidebar />);

      // 직접 링크인 연동 메뉴로 테스트
      const integrationsLink = screen.getByRole("link", { name: /연동/ });
      expect(integrationsLink).toHaveAttribute("data-active", "true");
    });

    it("/apps 경로에서 구독 메뉴가 활성 상태여야 한다", async () => {
      const { usePathname } = await import("next/navigation");
      vi.mocked(usePathname).mockReturnValue("/apps");

      renderWithProvider(<AppSidebar />);

      const subscriptionsLink = screen.getByRole("link", { name: /구독/ });
      expect(subscriptionsLink).toHaveAttribute("data-active", "true");
    });

    it("/users 경로에서 조직관리 메뉴가 활성 상태여야 한다", async () => {
      const { usePathname } = await import("next/navigation");
      vi.mocked(usePathname).mockReturnValue("/users");

      renderWithProvider(<AppSidebar />);

      const orgLink = screen.getByRole("link", { name: /조직 관리/ });
      expect(orgLink).toHaveAttribute("data-active", "true");
    });
  });
});
