// src/components/apps/app-list.test.tsx
import type { AppListItem } from "@/types/app";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppList } from "./app-list";

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

const mutateAsyncMock = vi.fn();

// Mock refine delete hook
vi.mock("@refinedev/core", () => ({
  useDelete: () => ({
    mutateAsync: mutateAsyncMock,
    isLoading: false,
  }),
}));

const mockApps: AppListItem[] = [
  {
    id: "app-1",
    name: "Slack",
    status: "ACTIVE",
    source: "MANUAL",
    category: "Collaboration",
    customLogoUrl: null,
    catalogLogoUrl: "https://example.com/slack.png",
    ownerName: "홍길동",
    ownerEmail: "hong@test.com",
    subscriptionCount: 2,
    userAccessCount: 10,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-02"),
    teams: [],
  },
  {
    id: "app-2",
    name: "Notion",
    status: "INACTIVE",
    source: "SSO_DISCOVERY",
    category: "Productivity",
    customLogoUrl: "https://custom.com/notion.png",
    catalogLogoUrl: null,
    ownerName: null,
    ownerEmail: null,
    subscriptionCount: 1,
    userAccessCount: 5,
    createdAt: new Date("2024-01-03"),
    updatedAt: new Date("2024-01-04"),
    teams: [],
  },
  {
    id: "app-3",
    name: "Legacy App",
    status: "BLOCKED",
    source: "MANUAL",
    category: null,
    customLogoUrl: null,
    catalogLogoUrl: null,
    ownerName: null,
    ownerEmail: null,
    subscriptionCount: 0,
    userAccessCount: 0,
    createdAt: new Date("2024-01-05"),
    updatedAt: new Date("2024-01-06"),
    teams: [],
  },
];

describe("AppList", () => {
  beforeEach(() => {
    mutateAsyncMock.mockReset();
  });

  it("앱 목록이 비어있으면 안내 메시지를 표시해야 한다", () => {
    render(<AppList apps={[]} />);

    expect(screen.getByText("등록된 앱이 없습니다")).toBeInTheDocument();
    expect(screen.getByText("첫 번째 앱 등록하기")).toBeInTheDocument();
  });

  it("앱 목록이 있으면 테이블을 표시해야 한다", () => {
    render(<AppList apps={mockApps} />);

    expect(screen.getByText("Slack")).toBeInTheDocument();
    expect(screen.getByText("Notion")).toBeInTheDocument();
    expect(screen.getByText("Legacy App")).toBeInTheDocument();
  });

  it("앱 이름은 상세 페이지 링크여야 한다", () => {
    render(<AppList apps={mockApps} />);

    const slackLink = screen.getByText("Slack").closest("a");
    expect(slackLink).toHaveAttribute("href", "/apps/app-1");
  });

  it("앱 상태에 따라 올바른 배지를 표시해야 한다", () => {
    render(<AppList apps={mockApps} />);

    expect(screen.getByText("활성")).toBeInTheDocument();
    expect(screen.getByText("비활성")).toBeInTheDocument();
    expect(screen.getByText("차단됨")).toBeInTheDocument();
  });

  it("카테고리가 없으면 - 를 표시해야 한다", () => {
    render(<AppList apps={mockApps} />);

    const rows = screen.getAllByRole("row");
    // Legacy App 행에 "-" 표시 확인
    expect(rows[3]).toHaveTextContent("-");
  });

  it("구독 수와 사용자 수를 표시해야 한다", () => {
    render(<AppList apps={mockApps} />);

    const rows = screen.getAllByRole("row");
    // Slack 행 (index 1)
    expect(rows[1]).toHaveTextContent("2"); // subscriptionCount
    expect(rows[1]).toHaveTextContent("10"); // userAccessCount
  });

  it("등록일을 포맷하여 표시해야 한다", () => {
    render(<AppList apps={mockApps} />);

    expect(screen.getByText("2024.01.01")).toBeInTheDocument();
    expect(screen.getByText("2024.01.03")).toBeInTheDocument();
  });

  it("로고 URL이 있으면 이미지를 표시해야 한다", () => {
    render(<AppList apps={mockApps} />);

    const slackImg = screen.getByAltText("Slack");
    expect(slackImg).toHaveAttribute("src", "https://example.com/slack.png");
  });

  it("로고 URL이 없으면 첫 글자를 표시해야 한다", () => {
    render(<AppList apps={mockApps} />);

    expect(screen.getByText("L")).toBeInTheDocument(); // Legacy App
  });

  it("관리 권한이 없으면 액션 대신 '-' 표시", () => {
    render(<AppList apps={mockApps} canManage={false} />);

    // 테이블 마지막 헤더와 같은 열에 '-' 표시
    expect(screen.getAllByText("-")[0]).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /수정/ })
    ).not.toBeInTheDocument();
  });

  it("삭제 확인 시 refine deleteOne을 호출해야 한다", async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockResolvedValue({ data: { id: "app-1" } });

    render(<AppList apps={mockApps} />);

    // 첫 번째 행의 메뉴 버튼 클릭
    const menuButtons = screen.getAllByRole("button", { name: "" });
    await user.click(menuButtons[0]);

    // 삭제 항목 클릭
    const deleteMenuItem = screen.getByText("삭제");
    await user.click(deleteMenuItem);

    // 확인 버튼 클릭
    const confirmButton = screen.getByRole("button", { name: "삭제" });
    await user.click(confirmButton);

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      resource: "apps",
      id: "app-1",
      mutationMode: "pessimistic",
    });
  });
});
