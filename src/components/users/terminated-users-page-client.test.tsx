// src/components/users/terminated-users-page-client.test.tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TerminatedUsersPageClient } from "./terminated-users-page-client";

const mockUseList = vi.fn();

vi.mock("@refinedev/core", () => ({
  useList: (...args: unknown[]) => mockUseList(...args),
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

// Mock next/navigation (next-auth 내부 의존 차단)
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock next-auth
vi.mock("next-auth", () => ({
  __esModule: true,
  default: () => ({}),
  auth: vi.fn(),
}));

const mockTerminatedUsers = [
  {
    id: "user-1",
    email: "terminated@example.com",
    name: "퇴사자",
    avatarUrl: null,
    role: "MEMBER",
    status: "TERMINATED",
    department: "개발팀",
    terminatedAt: new Date("2024-01-05"),
    appAccesses: [
      {
        id: "access-1",
        appId: "app-1",
        appName: "Slack",
        appLogoUrl: null,
        lastAccessedAt: new Date("2024-01-04"),
      },
    ],
  },
];

describe("TerminatedUsersPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseList.mockReturnValue({
      query: {
        data: { data: mockTerminatedUsers, total: 1 },
        isLoading: false,
      },
    });
  });

  it("퇴사자 목록을 렌더링한다", () => {
    render(<TerminatedUsersPageClient />);

    expect(screen.getByText("퇴사자")).toBeInTheDocument();
    expect(screen.getByText("terminated@example.com")).toBeInTheDocument();
  });

  it("로딩 중이면 로딩 상태를 표시한다", () => {
    mockUseList.mockReturnValueOnce({
      query: { data: undefined, isLoading: true },
    });

    render(<TerminatedUsersPageClient />);

    expect(screen.getByText(/퇴사자 목록을 불러오는 중/)).toBeInTheDocument();
  });

  it("데이터가 없으면 빈 배열을 전달한다", () => {
    mockUseList.mockReturnValueOnce({
      query: { data: { data: [], total: 0 }, isLoading: false },
    });

    render(<TerminatedUsersPageClient />);

    // TerminatedUsersList에서 빈 목록 처리
    expect(
      screen.getByText("미회수 접근 권한이 있는 퇴사자가 없습니다")
    ).toBeInTheDocument();
  });

  it("useList를 올바른 파라미터로 호출한다", () => {
    render(<TerminatedUsersPageClient />);

    expect(mockUseList).toHaveBeenCalledWith({
      resource: "terminated-users",
      pagination: { pageSize: 20 },
    });
  });
});
