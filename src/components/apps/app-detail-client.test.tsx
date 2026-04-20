// src/components/apps/app-detail-client.test.tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppDetailClient } from "./app-detail-client";

const mockUseShow = vi.fn();
const mockUseCan = vi.fn();
const mockRouter = { push: vi.fn(), back: vi.fn() };

vi.mock("@refinedev/core", () => ({
  useShow: (...args: unknown[]) => mockUseShow(...args),
  useCan: (...args: unknown[]) => mockUseCan(...args),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
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

const mockAppData = {
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
};

describe("AppDetailClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseShow.mockReturnValue({
      query: {
        data: { data: mockAppData },
        isLoading: false,
      },
    });
    mockUseCan.mockReturnValue({ data: { can: true } });
  });

  it("앱 이름을 제목으로 렌더링한다", () => {
    render(<AppDetailClient id="app-1" />);

    // PageHeader와 AppDetail 모두 앱 이름을 표시할 수 있음
    const headings = screen.getAllByRole("heading", { name: "Slack" });
    expect(headings.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText("앱의 상세 정보를 확인하고 관리합니다")
    ).toBeInTheDocument();
  });

  it("로딩 중이면 로딩 상태를 표시한다", () => {
    mockUseShow.mockReturnValueOnce({
      query: { data: undefined, isLoading: true },
    });

    render(<AppDetailClient id="app-1" />);

    expect(screen.getByText(/로딩 중/)).toBeInTheDocument();
  });

  it("앱이 없으면 에러 메시지를 표시한다", () => {
    mockUseShow.mockReturnValueOnce({
      query: { data: { data: null }, isLoading: false },
    });

    render(<AppDetailClient id="app-1" />);

    expect(screen.getByText(/앱을 찾을 수 없습니다/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /목록으로/ })).toHaveAttribute(
      "href",
      "/apps"
    );
  });

  it("useShow를 올바른 파라미터로 호출한다", () => {
    render(<AppDetailClient id="app-123" />);

    expect(mockUseShow).toHaveBeenCalledWith({
      resource: "apps",
      id: "app-123",
      queryOptions: {
        enabled: true,
      },
    });
  });

  it("수정 버튼 링크가 올바른 경로를 가진다", () => {
    render(<AppDetailClient id="app-1" />);

    // PageHeader와 AppDetail 모두 수정 링크를 가질 수 있음
    const editLinks = screen.getAllByRole("link", { name: /수정/ });
    expect(editLinks.length).toBeGreaterThanOrEqual(1);
    expect(editLinks[0]).toHaveAttribute("href", "/apps/app-1/edit");
  });
});
