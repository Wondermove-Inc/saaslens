import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SubscriptionPageClient } from "./subscription-page-client";

const mockUseList = vi.fn();

vi.mock("@refinedev/core", () => ({
  useList: (...args: unknown[]) => mockUseList(...args),
}));

vi.mock("@/components/subscriptions/subscription-suggestions", () => ({
  SubscriptionSuggestions: () => (
    <div data-testid="suggestions">suggestions</div>
  ),
}));

// next/navigation mock (next-auth 내부 의존 차단)
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// next-auth의 내부 env import 방지용
vi.mock("next-auth", () => ({
  __esModule: true,
  default: () => ({}),
  auth: vi.fn(),
}));

describe("SubscriptionPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseList.mockReturnValue({
      query: {
        data: {
          data: [
            {
              id: "sub-1",
              appId: "app-1",
              appName: "Slack",
              appLogoUrl: null,
              status: "ACTIVE",
              billingCycle: "MONTHLY",
              amount: 10000,
              currency: "KRW",
              totalLicenses: 10,
              usedLicenses: 5,
              renewalDate: "2024-02-01",
            },
          ],
          total: 1,
        },
        isLoading: false,
      },
    });
  });

  it("리스트와 총 개수를 표시한다", () => {
    render(<SubscriptionPageClient canManage />);

    // 페이지 타이틀: "구독 관리"
    expect(screen.getByText("구독 관리")).toBeInTheDocument();
    // 전체 구독 KPI 카드
    expect(screen.getByText("전체 구독")).toBeInTheDocument();
    expect(screen.getByText("Slack")).toBeInTheDocument();
  });

  it("로딩 중이면 로딩 상태를 표시한다", () => {
    mockUseList.mockReturnValueOnce({
      query: { data: undefined, isLoading: true },
    });

    render(<SubscriptionPageClient canManage />);

    expect(screen.getByText(/로딩 중/)).toBeInTheDocument();
  });

  it("관리자만 추천 섹션을 볼 수 있다", () => {
    const { rerender } = render(<SubscriptionPageClient canManage />);
    expect(screen.getByTestId("suggestions")).toBeInTheDocument();

    rerender(<SubscriptionPageClient canManage={false} />);
    expect(screen.queryByTestId("suggestions")).not.toBeInTheDocument();
  });
});
