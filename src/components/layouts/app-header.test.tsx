// src/components/layouts/app-header.test.tsx
import { SidebarProvider } from "@/components/ui/sidebar";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/actions/auth", () => ({
  logout: vi.fn(),
}));

import messages from "@/i18n/messages/ko.json";
import { AppHeader } from "./app-header";

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

describe("AppHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("렌더링", () => {
    it("헤더가 렌더링되어야 한다", () => {
      renderWithProvider(<AppHeader />);
      expect(screen.getByTestId("app-header")).toBeInTheDocument();
    });

    it("사이드바 토글 버튼이 있어야 한다", () => {
      renderWithProvider(<AppHeader />);
      // SidebarTrigger는 data-sidebar="trigger" 속성을 가짐
      expect(screen.getByText(/toggle sidebar/i)).toBeInTheDocument();
    });
  });

  describe("검색", () => {
    it("검색 버튼이 있어야 한다", () => {
      renderWithProvider(<AppHeader />);
      // CommandSearch는 버튼으로 표시되며 "검색..." 텍스트를 포함
      expect(screen.getByText(/검색/i)).toBeInTheDocument();
    });
  });

  describe("알림", () => {
    it("알림 버튼이 있어야 한다", () => {
      renderWithProvider(<AppHeader />);
      expect(screen.getByLabelText(/알림/i)).toBeInTheDocument();
    });
  });

  describe("사용자 메뉴", () => {
    it("사용자 아바타가 표시되어야 한다", () => {
      renderWithProvider(<AppHeader />);
      expect(screen.getByTestId("user-menu-trigger")).toBeInTheDocument();
    });

    it("사용자 메뉴 클릭 시 드롭다운이 표시되어야 한다", async () => {
      const user = userEvent.setup();
      renderWithProvider(<AppHeader />);

      const userMenuTrigger = screen.getByTestId("user-menu-trigger");
      await user.click(userMenuTrigger);

      expect(screen.getByText("프로필")).toBeInTheDocument();
      expect(screen.getByText("설정")).toBeInTheDocument();
      expect(screen.getByText("로그아웃")).toBeInTheDocument();
    });
  });
});
