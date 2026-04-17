// src/app/(auth)/onboarding/page.test.tsx
import messages from "@/i18n/messages/ko.json";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingPage from "./page";

// createOrganization mock
vi.mock("@/actions/organization", () => ({
  createOrganization: vi.fn(),
}));

describe("OnboardingPage", () => {
  const renderWithIntl = (ui: React.ReactElement) =>
    render(
      <NextIntlClientProvider locale="ko" messages={messages}>
        {ui}
      </NextIntlClientProvider>
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("렌더링", () => {
    it("온보딩 페이지가 렌더링되어야 한다", () => {
      renderWithIntl(<OnboardingPage />);
      expect(screen.getByTestId("onboarding-page")).toBeInTheDocument();
    });

    it("페이지 제목이 표시되어야 한다", () => {
      renderWithIntl(<OnboardingPage />);
      expect(
        screen.getByText("조직 생성 후 바로 시작하기")
      ).toBeInTheDocument();
    });

    it("페이지 설명이 표시되어야 한다", () => {
      renderWithIntl(<OnboardingPage />);
      expect(
        screen.getByText(/어떤 목표로 활용할지 선택하면/)
      ).toBeInTheDocument();
    });
  });

  describe("폼 요소", () => {
    it("조직명 입력 필드가 있어야 한다", () => {
      renderWithIntl(<OnboardingPage />);
      expect(screen.getByLabelText(/조직명/i)).toBeInTheDocument();
    });

    it("조직명 입력 필드에 placeholder가 있어야 한다", () => {
      renderWithIntl(<OnboardingPage />);
      expect(screen.getByPlaceholderText(/AGA HQ/)).toBeInTheDocument();
    });

    it("제출 버튼이 있어야 한다", () => {
      renderWithIntl(<OnboardingPage />);
      expect(
        screen.getByRole("button", { name: /시작하기/i })
      ).toBeInTheDocument();
    });
  });

  describe("입력 동작", () => {
    it("조직명을 입력할 수 있어야 한다", async () => {
      const user = userEvent.setup();
      renderWithIntl(<OnboardingPage />);

      const input = screen.getByLabelText(/조직명/i);
      await user.type(input, "테스트 회사");

      expect(input).toHaveValue("테스트 회사");
    });
  });
});
