// src/components/users/user-page-client.test.tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserPageClient } from "./user-page-client";

const mockUseList = vi.fn();
const mockUseCan = vi.fn();

vi.mock("@refinedev/core", () => ({
  useList: (...args: unknown[]) => mockUseList(...args),
  useCan: (...args: unknown[]) => mockUseCan(...args),
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

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

const mockUsers = [
  {
    id: "user-1",
    email: "admin@example.com",
    name: "관리자",
    avatarUrl: null,
    role: "ADMIN",
    status: "ACTIVE",
    department: "경영팀",
    jobTitle: "CTO",
    lastLoginAt: new Date("2024-01-15"),
    terminatedAt: null,
    assignedAppCount: 10,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-15"),
  },
];

describe("UserPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseList.mockReturnValue({
      query: {
        data: { data: mockUsers, total: 1 },
        isLoading: false,
      },
    });
    mockUseCan.mockReturnValue({ data: { can: true } });
  });

  it("사용자 관리 페이지를 렌더링한다", () => {
    render(<UserPageClient />);

    expect(screen.getByText("사용자 관리")).toBeInTheDocument();
    expect(
      screen.getByText(/조직의 사용자를 조회하고 관리하세요/)
    ).toBeInTheDocument();
  });

  it("KPI 통계 카드를 표시한다", () => {
    render(<UserPageClient />);

    expect(screen.getByText("전체 사용자")).toBeInTheDocument();
    expect(screen.getByText("활성 사용자")).toBeInTheDocument();
    expect(screen.getByText("비활성")).toBeInTheDocument();
    expect(screen.getByText("퇴사")).toBeInTheDocument();
  });

  it("사용자 목록을 표시한다", () => {
    render(<UserPageClient />);

    // "관리자"는 이름과 역할 배지에 모두 나타남
    expect(screen.getAllByText("관리자").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
  });

  it("로딩 중이면 로딩 상태를 표시한다", () => {
    mockUseList.mockReturnValueOnce({
      query: {
        data: undefined,
        isLoading: true,
      },
    });

    render(<UserPageClient />);

    expect(screen.getByText(/로딩 중/)).toBeInTheDocument();
  });

  it("데이터가 없으면 빈 상태를 표시한다", () => {
    mockUseList.mockReturnValueOnce({
      query: {
        data: { data: [], total: 0 },
        isLoading: false,
      },
    });

    render(<UserPageClient />);

    expect(screen.getByText("등록된 사용자가 없습니다")).toBeInTheDocument();
  });

  it("useList를 올바른 파라미터로 호출한다", () => {
    render(<UserPageClient />);

    expect(mockUseList).toHaveBeenCalledWith({
      resource: "users",
      pagination: { pageSize: 50 },
      sorters: [{ field: "name", order: "asc" }],
    });
  });
});
