// src/components/subscriptions/subscription-detail-client.test.tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SubscriptionDetailClient } from "./subscription-detail-client";

const mockUseShow = vi.fn();

vi.mock("@refinedev/core", () => ({
  useShow: (...args: unknown[]) => mockUseShow(...args),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

// Mock deleteSubscription action
vi.mock("@/actions/subscriptions", () => ({
  deleteSubscription: vi.fn(),
  getLinkedPayments: vi.fn().mockResolvedValue({ success: true, data: [] }),
}));

// Mock notification-settings action
vi.mock("@/actions/notification-settings", () => ({
  updateNotificationSettings: vi.fn().mockResolvedValue({ success: true }),
}));

const mockSubscriptionData = {
  id: "sub-1",
  appId: "app-1",
  appName: "Slack",
  appLogoUrl: "https://example.com/slack.png",
  status: "ACTIVE",
  billingCycle: "MONTHLY",
  amount: 10000,
  currency: "KRW",
  totalLicenses: 100,
  usedLicenses: 80,
  startDate: new Date("2024-01-01"),
  endDate: null,
  renewalDate: new Date("2024-02-01"),
  autoRenewal: true,
  renewalAlert30: true,
  renewalAlert60: false,
  renewalAlert90: false,
  contractUrl: "https://example.com/contract.pdf",
  notes: "테스트 메모입니다",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-15"),
};

describe("SubscriptionDetailClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseShow.mockReturnValue({
      query: {
        data: { data: mockSubscriptionData },
        isLoading: false,
      },
    });
  });

  it("구독 상세 정보를 렌더링한다", async () => {
    render(<SubscriptionDetailClient id="sub-1" />);

    // 타이틀: "{appName} 구독"
    expect(await screen.findByText("Slack 구독")).toBeInTheDocument();
    expect(screen.getAllByText("Slack").length).toBeGreaterThanOrEqual(1);
  });

  it("로딩 중이면 로딩 상태를 표시한다", () => {
    mockUseShow.mockReturnValueOnce({
      query: { data: undefined, isLoading: true },
    });

    render(<SubscriptionDetailClient id="sub-1" />);

    expect(screen.getByText(/구독 정보를 불러오는 중/)).toBeInTheDocument();
  });

  it("구독이 없으면 에러 메시지를 표시한다", () => {
    mockUseShow.mockReturnValueOnce({
      query: { data: { data: null }, isLoading: false },
    });

    render(<SubscriptionDetailClient id="sub-1" />);

    expect(screen.getByText(/구독을 찾을 수 없습니다/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /목록으로/ })).toHaveAttribute(
      "href",
      "/subscriptions"
    );
  });

  it("useShow를 올바른 파라미터로 호출한다", () => {
    render(<SubscriptionDetailClient id="sub-123" />);

    expect(mockUseShow).toHaveBeenCalledWith({
      resource: "subscriptions",
      id: "sub-123",
      queryOptions: {
        enabled: true,
      },
    });
  });
});
