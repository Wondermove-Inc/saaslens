// src/components/subscriptions/renewal-calendar.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// 테스트 전 컴포넌트 import (mock 후에 import)
import type { CalendarData, RenewalItem } from "@/actions/subscriptions";
import { RenewalCalendar } from "./renewal-calendar";

// 테스트용 mock 데이터
const mockRenewalItem: RenewalItem = {
  subscriptionId: "sub-1",
  appId: "app-1",
  appName: "Slack",
  appLogo: "/logos/slack.png",
  planName: "Enterprise",
  amount: 100000,
  currency: "KRW",
  renewalDate: "2024-12-15",
  status: "ACTIVE",
};

const mockCalendarData: CalendarData = {
  year: 2024,
  month: 12,
  renewals: {
    "2024-12-15": [mockRenewalItem],
    "2024-12-20": [
      { ...mockRenewalItem, subscriptionId: "sub-2", appName: "Notion" },
    ],
  },
};

describe("RenewalCalendar", () => {
  const mockOnMonthChange = vi.fn();
  const mockOnDateSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("렌더링", () => {
    it("캘린더가 올바르게 렌더링되어야 한다", () => {
      render(
        <RenewalCalendar
          calendarData={mockCalendarData}
          onMonthChange={mockOnMonthChange}
          onDateSelect={mockOnDateSelect}
        />
      );

      // 연월 표시 확인
      expect(screen.getByText(/2024년 12월/)).toBeInTheDocument();
    });

    it("갱신일에 Badge가 표시되어야 한다", () => {
      render(
        <RenewalCalendar
          calendarData={mockCalendarData}
          onMonthChange={mockOnMonthChange}
          onDateSelect={mockOnDateSelect}
        />
      );

      // Badge 확인 (갱신 건수 표시)
      const badges = screen.getAllByTestId("renewal-badge");
      expect(badges.length).toBeGreaterThanOrEqual(2);
    });

    it("빈 데이터일 때 빈 캘린더가 표시되어야 한다", () => {
      const emptyData: CalendarData = {
        year: 2024,
        month: 12,
        renewals: {},
      };

      render(
        <RenewalCalendar
          calendarData={emptyData}
          onMonthChange={mockOnMonthChange}
          onDateSelect={mockOnDateSelect}
        />
      );

      expect(screen.getByText(/2024년 12월/)).toBeInTheDocument();
      expect(screen.queryAllByTestId("renewal-badge")).toHaveLength(0);
    });
  });

  describe("네비게이션", () => {
    it("이전 월 버튼 클릭 시 onMonthChange가 호출되어야 한다", async () => {
      const user = userEvent.setup();

      render(
        <RenewalCalendar
          calendarData={mockCalendarData}
          onMonthChange={mockOnMonthChange}
          onDateSelect={mockOnDateSelect}
        />
      );

      const prevButton = screen.getByRole("button", { name: /이전/ });
      await user.click(prevButton);

      expect(mockOnMonthChange).toHaveBeenCalledWith(2024, 11);
    });

    it("다음 월 버튼 클릭 시 onMonthChange가 호출되어야 한다", async () => {
      const user = userEvent.setup();

      render(
        <RenewalCalendar
          calendarData={mockCalendarData}
          onMonthChange={mockOnMonthChange}
          onDateSelect={mockOnDateSelect}
        />
      );

      const nextButton = screen.getByRole("button", { name: /다음/ });
      await user.click(nextButton);

      expect(mockOnMonthChange).toHaveBeenCalledWith(2025, 1);
    });

    it("오늘 버튼 클릭 시 현재 월로 이동해야 한다", async () => {
      const user = userEvent.setup();

      render(
        <RenewalCalendar
          calendarData={mockCalendarData}
          onMonthChange={mockOnMonthChange}
          onDateSelect={mockOnDateSelect}
        />
      );

      const todayButton = screen.getByRole("button", { name: /오늘/ });
      await user.click(todayButton);

      // 현재 날짜 기준으로 호출 확인
      const now = new Date();
      expect(mockOnMonthChange).toHaveBeenCalledWith(
        now.getFullYear(),
        now.getMonth() + 1
      );
    });
  });

  describe("날짜 선택", () => {
    it("갱신이 있는 날짜 클릭 시 onDateSelect가 호출되어야 한다", async () => {
      const user = userEvent.setup();

      render(
        <RenewalCalendar
          calendarData={mockCalendarData}
          onMonthChange={mockOnMonthChange}
          onDateSelect={mockOnDateSelect}
        />
      );

      // 15일 날짜 클릭 (갱신이 있는 날)
      const dayWithRenewal = screen.getByTestId("day-15");
      await user.click(dayWithRenewal);

      expect(mockOnDateSelect).toHaveBeenCalledWith("2024-12-15");
    });
  });
});
