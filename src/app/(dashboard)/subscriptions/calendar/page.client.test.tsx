// src/app/(dashboard)/subscriptions/calendar/page.client.test.tsx
import type { CalendarData, RenewalItem } from "@/actions/subscriptions";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Refine useCustom
const mockUseCustom = vi.fn();
vi.mock("@refinedev/core", () => ({
  useCustom: (...args: unknown[]) => mockUseCustom(...args),
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock child components (이전/다음 로직은 RenewalCalendar와 동일: 1월↔전년 12월, 12월↔다음년 1월)
vi.mock("@/components/subscriptions/renewal-calendar", () => ({
  RenewalCalendar: ({
    calendarData,
    onMonthChange,
    onDateSelect,
    selectedDate,
  }: {
    calendarData: CalendarData;
    onMonthChange: (year: number, month: number) => void;
    onDateSelect: (date: string) => void;
    selectedDate: string | null;
  }) => {
    const handlePrev = () => {
      if (calendarData.month === 1) onMonthChange(calendarData.year - 1, 12);
      else onMonthChange(calendarData.year, calendarData.month - 1);
    };
    const handleNext = () => {
      if (calendarData.month === 12) onMonthChange(calendarData.year + 1, 1);
      else onMonthChange(calendarData.year, calendarData.month + 1);
    };
    return (
      <div data-testid="renewal-calendar">
        <div data-testid="calendar-year">{calendarData.year}</div>
        <div data-testid="calendar-month">{calendarData.month}</div>
        <div data-testid="selected-date">{selectedDate ?? "none"}</div>
        <button data-testid="prev-month" onClick={handlePrev}>
          이전
        </button>
        <button data-testid="next-month" onClick={handleNext}>
          다음
        </button>
        <button
          data-testid="select-date"
          onClick={() => onDateSelect("2024-12-15")}
        >
          날짜 선택
        </button>
      </div>
    );
  },
}));

vi.mock("@/components/subscriptions/renewal-day-detail", () => ({
  RenewalDayDetail: ({
    date,
    renewals,
    onClose,
  }: {
    date: string;
    renewals: RenewalItem[];
    onClose: () => void;
  }) => (
    <div data-testid="renewal-day-detail">
      <div data-testid="detail-date">{date}</div>
      <div data-testid="detail-renewals-count">{renewals.length}</div>
      <button data-testid="close-detail" onClick={onClose}>
        닫기
      </button>
    </div>
  ),
}));

// Import after mocks
import { RenewalCalendarPageClient } from "./page.client";

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
  },
};

describe("RenewalCalendarPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock: 캘린더 데이터 조회
    // useCustom returns { query: { data, isLoading, isFetching } }
    mockUseCustom.mockImplementation((config: Record<string, unknown>) => {
      const queryParams = (config.config as { query?: { date?: string } })
        ?.query;

      // date 파라미터가 있으면 날짜별 갱신 조회
      if (queryParams?.date) {
        return {
          query: {
            data: {
              data: { date: queryParams.date, renewals: [mockRenewalItem] },
            },
            isLoading: false,
            isFetching: false,
          },
        };
      }

      // 기본 캘린더 조회
      return {
        query: {
          data: { data: mockCalendarData },
          isLoading: false,
          isFetching: false,
        },
      };
    });
  });

  describe("렌더링", () => {
    it("캘린더 페이지를 렌더링한다", () => {
      render(<RenewalCalendarPageClient initialData={mockCalendarData} />);

      expect(screen.getByTestId("renewal-calendar")).toBeInTheDocument();
      expect(screen.getByTestId("calendar-year")).toHaveTextContent("2024");
      expect(screen.getByTestId("calendar-month")).toHaveTextContent("12");
    });

    it("useCustom을 올바른 파라미터로 호출한다", () => {
      render(<RenewalCalendarPageClient initialData={mockCalendarData} />);

      // 캘린더 데이터 조회 호출 확인
      expect(mockUseCustom).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/api/v1/subscriptions/calendar",
          method: "get",
          config: expect.objectContaining({
            query: { year: 2024, month: 12 },
          }),
        })
      );
    });

    it("로딩 중이면 data-loading이 true이다", () => {
      mockUseCustom.mockReturnValue({
        query: {
          data: { data: mockCalendarData },
          isLoading: true,
          isFetching: false,
        },
      });

      const { container } = render(
        <RenewalCalendarPageClient initialData={mockCalendarData} />
      );

      const mainDiv = container.querySelector("[data-loading='true']");
      expect(mainDiv).toBeInTheDocument();
    });

    it("로딩 완료되면 data-loading이 false이다", () => {
      const { container } = render(
        <RenewalCalendarPageClient initialData={mockCalendarData} />
      );

      const mainDiv = container.querySelector("[data-loading='false']");
      expect(mainDiv).toBeInTheDocument();
    });
  });

  describe("날짜 선택 안내", () => {
    it("날짜 미선택 시 안내 메시지를 표시한다", () => {
      render(<RenewalCalendarPageClient initialData={mockCalendarData} />);

      expect(screen.getByText(/날짜를 선택하면 해당 일의/)).toBeInTheDocument();
    });
  });

  describe("월 변경", () => {
    it("이전 월 클릭 시 URL과 상태를 업데이트한다", async () => {
      const user = userEvent.setup();

      render(<RenewalCalendarPageClient initialData={mockCalendarData} />);

      await user.click(screen.getByTestId("prev-month"));

      expect(mockPush).toHaveBeenCalledWith(
        "/subscriptions/calendar?year=2024&month=11"
      );
    });

    it("다음 월 클릭 시 URL과 상태를 업데이트한다", async () => {
      const user = userEvent.setup();

      render(<RenewalCalendarPageClient initialData={mockCalendarData} />);

      await user.click(screen.getByTestId("next-month"));

      // 12월 → 다음해 1월 (연도 롤오버)
      expect(mockPush).toHaveBeenCalledWith(
        "/subscriptions/calendar?year=2025&month=1"
      );
    });
  });

  describe("날짜 선택", () => {
    it("날짜 선택 시 상세 패널을 표시한다", async () => {
      const user = userEvent.setup();

      render(<RenewalCalendarPageClient initialData={mockCalendarData} />);

      await user.click(screen.getByTestId("select-date"));

      // 선택된 날짜의 상세 패널이 표시됨
      expect(screen.getByTestId("renewal-day-detail")).toBeInTheDocument();
      expect(screen.getByTestId("detail-date")).toHaveTextContent("2024-12-15");
    });

    it("날짜 선택 시 갱신 데이터를 조회한다", async () => {
      const user = userEvent.setup();

      render(<RenewalCalendarPageClient initialData={mockCalendarData} />);

      await user.click(screen.getByTestId("select-date"));

      // date 파라미터로 useCustom 호출 확인
      expect(mockUseCustom).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/api/v1/subscriptions/calendar",
          config: expect.objectContaining({
            query: { date: "2024-12-15" },
          }),
          queryOptions: expect.objectContaining({
            enabled: true,
          }),
        })
      );
    });

    it("상세 닫기 버튼 클릭 시 상세 패널을 숨긴다", async () => {
      const user = userEvent.setup();

      render(<RenewalCalendarPageClient initialData={mockCalendarData} />);

      // 날짜 선택
      await user.click(screen.getByTestId("select-date"));
      expect(screen.getByTestId("renewal-day-detail")).toBeInTheDocument();

      // 닫기
      await user.click(screen.getByTestId("close-detail"));
      expect(
        screen.queryByTestId("renewal-day-detail")
      ).not.toBeInTheDocument();
      expect(screen.getByText(/날짜를 선택하면 해당 일의/)).toBeInTheDocument();
    });
  });

  describe("로딩 상태", () => {
    it("날짜 갱신 로딩 중 로딩 스피너를 표시한다", async () => {
      const user = userEvent.setup();

      // 첫 번째 호출: 캘린더 데이터 (즉시 반환)
      // 두 번째 호출: 날짜별 갱신 (로딩 중)
      let callCount = 0;
      mockUseCustom.mockImplementation(() => {
        callCount++;
        if (callCount > 1) {
          return {
            query: {
              data: null,
              isLoading: true,
              isFetching: false,
            },
          };
        }
        return {
          query: {
            data: { data: mockCalendarData },
            isLoading: false,
            isFetching: false,
          },
        };
      });

      render(<RenewalCalendarPageClient initialData={mockCalendarData} />);

      await user.click(screen.getByTestId("select-date"));

      // 로딩 스피너가 표시됨 (Card with flex items-center)
      expect(
        screen.queryByTestId("renewal-day-detail")
      ).not.toBeInTheDocument();
    });
  });
});
