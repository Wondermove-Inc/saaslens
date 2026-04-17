// src/components/subscriptions/subscription-list.test.tsx
import type { SubscriptionListItem } from "@/types/subscription";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SubscriptionList } from "./subscription-list";

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
}));

const mockSubscriptions: SubscriptionListItem[] = [
  {
    id: "sub-1",
    appId: "app-1",
    appName: "Slack",
    appLogoUrl: "https://example.com/slack.png",
    status: "ACTIVE",
    billingCycle: "MONTHLY",
    billingType: "FLAT_RATE",
    amount: 10000,
    perSeatPrice: null,
    currency: "KRW",
    totalLicenses: 100,
    usedLicenses: 80,
    startDate: new Date("2024-01-01"),
    endDate: null,
    renewalDate: new Date("2024-02-01"),
    autoRenewal: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    teamId: "team-1",
    teamName: "Engineering",
    teams: [{ id: "team-1", name: "Engineering" }],
    assignedUsers: [],
  },
  {
    id: "sub-2",
    appId: "app-2",
    appName: "Notion",
    appLogoUrl: null,
    status: "EXPIRED",
    billingCycle: "YEARLY",
    billingType: "PER_SEAT",
    amount: 100000,
    perSeatPrice: 10000,
    currency: "USD",
    totalLicenses: null,
    usedLicenses: null,
    startDate: new Date("2023-01-01"),
    endDate: new Date("2024-01-01"),
    renewalDate: null,
    autoRenewal: false,
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-12-01"),
    teamId: null,
    teamName: null,
    teams: [],
    assignedUsers: [],
  },
  {
    id: "sub-3",
    appId: "app-3",
    appName: "Jira",
    appLogoUrl: "https://example.com/jira.png",
    status: "CANCELLED",
    billingCycle: "QUARTERLY",
    billingType: "FLAT_RATE",
    amount: 50000,
    perSeatPrice: null,
    currency: "KRW",
    totalLicenses: 50,
    usedLicenses: 45,
    startDate: new Date("2024-01-15"),
    endDate: new Date("2024-04-15"),
    renewalDate: new Date("2024-04-15"),
    autoRenewal: false,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
    teamId: "team-2",
    teamName: "Design",
    teams: [{ id: "team-2", name: "Design" }],
    assignedUsers: [
      { id: "user-1", name: "John Doe", email: "john@example.com" },
    ],
  },
];

describe("SubscriptionList", () => {
  it("구독 목록이 비어있으면 안내 메시지를 표시해야 한다", () => {
    render(<SubscriptionList subscriptions={[]} />);

    expect(screen.getByText("등록된 구독이 없습니다")).toBeInTheDocument();
    expect(screen.getByText("첫 번째 구독 등록하기")).toBeInTheDocument();
  });

  it("구독 목록이 있으면 테이블을 표시해야 한다", () => {
    render(<SubscriptionList subscriptions={mockSubscriptions} />);

    expect(screen.getByText("Slack")).toBeInTheDocument();
    expect(screen.getByText("Notion")).toBeInTheDocument();
    expect(screen.getByText("Jira")).toBeInTheDocument();
  });

  it("앱 이름은 구독 상세 페이지 링크여야 한다", () => {
    render(<SubscriptionList subscriptions={mockSubscriptions} />);

    const slackLink = screen.getByText("Slack").closest("a");
    expect(slackLink).toHaveAttribute("href", "/subscriptions/sub-1");
  });

  it("구독 상태에 따라 올바른 배지를 표시해야 한다", () => {
    render(<SubscriptionList subscriptions={mockSubscriptions} />);

    // 탭 필터와 테이블 배지에서 "활성" 텍스트가 중복될 수 있음
    expect(screen.getAllByText("활성").length).toBeGreaterThan(0);
    expect(screen.getAllByText("만료").length).toBeGreaterThan(0);
    expect(screen.getAllByText("취소됨").length).toBeGreaterThan(0);
  });

  it("결제 주기를 올바르게 표시해야 한다", () => {
    render(<SubscriptionList subscriptions={mockSubscriptions} />);

    expect(screen.getByText("월간")).toBeInTheDocument();
    expect(screen.getByText("연간")).toBeInTheDocument();
    expect(screen.getByText("분기")).toBeInTheDocument();
  });

  it("금액을 포맷하여 표시해야 한다", () => {
    render(<SubscriptionList subscriptions={mockSubscriptions} />);

    // KRW 금액
    expect(screen.getByText("₩10,000")).toBeInTheDocument();
    expect(screen.getByText("₩50,000")).toBeInTheDocument();
    // USD 금액
    expect(screen.getByText("$100,000")).toBeInTheDocument();
  });

  it("라이선스 사용량을 표시해야 한다", () => {
    render(<SubscriptionList subscriptions={mockSubscriptions} />);

    expect(screen.getByText("80/100")).toBeInTheDocument();
    expect(screen.getByText("45/50")).toBeInTheDocument();
    // 라이선스 없는 경우
    const rows = screen.getAllByRole("row");
    expect(rows[2]).toHaveTextContent("-");
  });

  it("갱신일을 포맷하여 표시해야 한다", () => {
    render(<SubscriptionList subscriptions={mockSubscriptions} />);

    expect(screen.getByText("2024.02.01")).toBeInTheDocument();
    expect(screen.getByText("2024.04.15")).toBeInTheDocument();
  });

  it("자동 갱신 여부를 표시해야 한다", () => {
    render(<SubscriptionList subscriptions={mockSubscriptions} />);

    const rows = screen.getAllByRole("row");
    // Slack: 자동 갱신 활성화
    expect(rows[1]).toHaveTextContent("자동");
    // Notion, Jira: 자동 갱신 비활성화
    expect(rows[2]).toHaveTextContent("수동");
    expect(rows[3]).toHaveTextContent("수동");
  });

  it("로고 URL이 있으면 이미지를 표시해야 한다", () => {
    render(<SubscriptionList subscriptions={mockSubscriptions} />);

    const slackImg = screen.getByAltText("Slack");
    expect(slackImg).toHaveAttribute("src", "https://example.com/slack.png");
  });

  it("로고 URL이 없으면 첫 글자를 표시해야 한다", () => {
    render(<SubscriptionList subscriptions={mockSubscriptions} />);

    expect(screen.getByText("N")).toBeInTheDocument(); // Notion
  });
});
