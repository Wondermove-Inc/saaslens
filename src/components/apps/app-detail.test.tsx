// src/components/apps/app-detail.test.tsx
import type { AppDetail as AppDetailType } from "@/types/app";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppDetail } from "./app-detail";

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

const mockApp: AppDetailType = {
  id: "app-1",
  name: "Slack",
  status: "ACTIVE",
  source: "MANUAL",
  category: "Collaboration",
  catalogId: null,
  customLogoUrl: "https://example.com/slack.png",
  catalogLogoUrl: null,
  customWebsite: "https://slack.com",
  notes: "팀 커뮤니케이션 도구",
  tags: ["chat", "team"],
  riskScore: null,
  discoveredAt: null,
  ownerName: "홍길동",
  ownerEmail: "hong@test.com",
  subscriptionCount: 2,
  userAccessCount: 10,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-02"),
  teams: [],
};

describe("AppDetail", () => {
  it("앱 정보를 표시해야 한다", () => {
    render(<AppDetail app={mockApp} />);

    expect(screen.getAllByText("Slack").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("활성").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Collaboration").length).toBeGreaterThanOrEqual(
      1
    );
  });

  it("수정 버튼을 표시해야 한다", () => {
    render(<AppDetail app={mockApp} />);

    const editButton = screen.getByRole("link", { name: /수정/ });
    expect(editButton).toHaveAttribute("href", "/apps/app-1/edit");
  });

  it("로고 이미지를 표시해야 한다", () => {
    render(<AppDetail app={mockApp} />);

    const logo = screen.getByAltText("Slack");
    expect(logo).toHaveAttribute("src", "https://example.com/slack.png");
  });

  it("로고가 없으면 첫 글자를 표시해야 한다", () => {
    const appWithoutLogo: AppDetailType = {
      ...mockApp,
      customLogoUrl: null,
      catalogLogoUrl: null,
    };

    render(<AppDetail app={appWithoutLogo} />);

    expect(screen.getByText("S")).toBeInTheDocument(); // Slack의 첫 글자
  });

  it("담당자 정보를 표시해야 한다", () => {
    render(<AppDetail app={mockApp} />);

    expect(screen.getByText("홍길동")).toBeInTheDocument();
    expect(screen.getByText("hong@test.com")).toBeInTheDocument();
  });

  it("담당자가 없으면 미지정으로 표시해야 한다", () => {
    const appWithoutOwner: AppDetailType = {
      ...mockApp,
      ownerName: null,
      ownerEmail: null,
    };

    render(<AppDetail app={appWithoutOwner} />);

    expect(
      screen.getByText("담당자가 지정되지 않았습니다")
    ).toBeInTheDocument();
  });

  it("구독 수와 사용자 수를 표시해야 한다", () => {
    render(<AppDetail app={mockApp} />);

    expect(screen.getByText("2")).toBeInTheDocument(); // subscriptionCount
    expect(screen.getByText("10")).toBeInTheDocument(); // userAccessCount
  });

  it("메모가 있으면 표시해야 한다", () => {
    render(<AppDetail app={mockApp} />);

    expect(screen.getByText("팀 커뮤니케이션 도구")).toBeInTheDocument();
  });

  it("태그를 표시해야 한다", () => {
    render(<AppDetail app={mockApp} />);

    expect(screen.getByText("chat")).toBeInTheDocument();
    expect(screen.getByText("team")).toBeInTheDocument();
  });

  it("웹사이트 링크를 표시해야 한다", () => {
    render(<AppDetail app={mockApp} />);

    const websiteLink = screen.getByRole("link", { name: /slack\.com/i });
    expect(websiteLink).toHaveAttribute("href", "https://slack.com");
  });
});
