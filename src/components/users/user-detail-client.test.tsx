// src/components/users/user-detail-client.test.tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserDetailClient } from "./user-detail-client";

const mockUseShow = vi.fn();
const mockUseCan = vi.fn();
const mockUseGetIdentity = vi.fn();
const mockRouter = { push: vi.fn(), back: vi.fn(), refresh: vi.fn() };

vi.mock("@refinedev/core", () => ({
  useShow: (...args: unknown[]) => mockUseShow(...args),
  useCan: (...args: unknown[]) => mockUseCan(...args),
  useGetIdentity: (...args: unknown[]) => mockUseGetIdentity(...args),
}));

// Mock next-intl: key passthrough with ICU param substitution
vi.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string, params?: Record<string, unknown>) => {
      if (params) {
        let result = key;
        for (const [k, v] of Object.entries(params)) {
          result = result.replace(`{${k}}`, String(v));
        }
        return result;
      }
      return key;
    };
    return t;
  },
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

// Mock next-auth (server module 의존 차단)
vi.mock("next-auth", () => ({
  __esModule: true,
  default: () => ({}),
  auth: vi.fn(),
}));

// Mock dialogs to cut off server-action import chains
vi.mock("./offboard-user-dialog", () => ({
  OffboardUserDialog: () => null,
}));

vi.mock("@/components/team/transfer-admin-dialog", () => ({
  TransferAdminDialog: () => null,
}));

const mockUserData = {
  id: "user-1",
  name: "홍길동",
  email: "hong@test.com",
  role: "MEMBER",
  status: "ACTIVE",
  department: "개발팀",
  team: null,
  assignedAppCount: 5,
  lastLoginAt: new Date("2024-01-15"),
  createdAt: new Date("2024-01-01"),
  appAccesses: [],
};

describe("UserDetailClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseShow.mockReturnValue({
      query: {
        data: { data: mockUserData },
        isLoading: false,
      },
    });
    mockUseCan.mockReturnValue({ data: { can: false } });
    mockUseGetIdentity.mockReturnValue({ data: null });
  });

  it("사용자 상세 정보를 렌더링한다", () => {
    render(<UserDetailClient id="user-1" />);

    // PageHeader에서 사용자 이름이 제목으로 표시됨
    expect(screen.getByRole("heading", { name: "홍길동" })).toBeInTheDocument();
    // 통합 카드 내부에 역할/상태 label (i18n key passthrough)
    expect(screen.getByText("users.role.member")).toBeInTheDocument();
    expect(screen.getByText("users.status.active")).toBeInTheDocument();
    // 구독 보기 버튼
    expect(
      screen.getByRole("button", { name: /users\.detail\.viewSubscriptions/ })
    ).toBeInTheDocument();
  });

  it("로딩 중이면 로딩 상태를 표시한다", () => {
    mockUseShow.mockReturnValueOnce({
      query: { data: undefined, isLoading: true },
    });

    render(<UserDetailClient id="user-1" />);

    expect(screen.getByText("users.detail.loading")).toBeInTheDocument();
  });

  it("사용자가 없으면 에러 메시지를 표시한다", () => {
    mockUseShow.mockReturnValueOnce({
      query: { data: { data: null }, isLoading: false },
    });

    render(<UserDetailClient id="user-1" />);

    expect(screen.getByText("users.detail.notFound")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /users\.detail\.backToList/ })
    ).toHaveAttribute("href", "/users");
  });

  it("부서 정보를 표시한다", () => {
    render(<UserDetailClient id="user-1" />);

    // department가 InfoItem value로 표시됨
    expect(screen.getByText("개발팀")).toBeInTheDocument();
  });

  it("팀 이름이 있으면 부서 대신 팀 이름을 표시한다", () => {
    mockUseShow.mockReturnValueOnce({
      query: {
        data: {
          data: {
            ...mockUserData,
            team: { id: "team-1", name: "프론트엔드팀" },
          },
        },
        isLoading: false,
      },
    });

    render(<UserDetailClient id="user-1" />);

    expect(screen.getByText("프론트엔드팀")).toBeInTheDocument();
  });

  it("부서가 없으면 - 를 표시한다", () => {
    mockUseShow.mockReturnValueOnce({
      query: {
        data: {
          data: { ...mockUserData, department: null, team: null },
        },
        isLoading: false,
      },
    });

    render(<UserDetailClient id="user-1" />);

    // "-" 문자가 여러 곳에 있을 수 있음
    expect(screen.getAllByText("-").length).toBeGreaterThanOrEqual(1);
  });

  it("앱 접근 수를 표시한다", () => {
    render(<UserDetailClient id="user-1" />);

    expect(screen.getByText("users.detail.appAccessCount")).toBeInTheDocument();
    expect(screen.getAllByText("5").length).toBeGreaterThanOrEqual(1);
  });

  it("useShow를 올바른 파라미터로 호출한다", () => {
    render(<UserDetailClient id="user-123" />);

    expect(mockUseShow).toHaveBeenCalledWith({
      resource: "users",
      id: "user-123",
      queryOptions: {
        enabled: true,
      },
    });
  });

  it("이름이 없으면 이메일을 타이틀로 표시한다", () => {
    mockUseShow.mockReturnValueOnce({
      query: {
        data: { data: { ...mockUserData, name: null } },
        isLoading: false,
      },
    });

    render(<UserDetailClient id="user-1" />);

    // PageHeader 제목에 이메일이 표시됨
    expect(
      screen.getByRole("heading", { name: "hong@test.com" })
    ).toBeInTheDocument();
  });

  it("연결된 앱 섹션이 표시되지 않는다", () => {
    render(<UserDetailClient id="user-1" />);

    // connectedApps key가 없어야 함
    expect(
      screen.queryByText("users.detail.connectedApps")
    ).not.toBeInTheDocument();
  });

  it("역할/상태가 카드 내부에만 표시된다", () => {
    render(<UserDetailClient id="user-1" />);

    // 카드 내부에 역할/상태 label이 있어야 함
    expect(screen.getByText("users.detail.role")).toBeInTheDocument();
    expect(screen.getByText("users.detail.status")).toBeInTheDocument();
  });

  describe("구독 KPI 그리드", () => {
    const mockSubscriptionSummary = {
      total: 8,
      monthlyAmount: 250000,
      renewingSoon: 2,
      currency: "KRW",
    };

    it("구독 요약이 있으면 KPI 값을 표시한다", () => {
      mockUseShow.mockReturnValueOnce({
        query: {
          data: {
            data: {
              ...mockUserData,
              subscriptionSummary: mockSubscriptionSummary,
            },
          },
          isLoading: false,
        },
      });

      render(<UserDetailClient id="user-1" />);

      // KPI 숫자 값 확인
      expect(screen.getByText("8")).toBeInTheDocument();
      expect(screen.getByText(/250,000/)).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();

      // KPI 라벨 확인
      expect(
        screen.getByText("users.detail.totalSubscriptions")
      ).toBeInTheDocument();
      expect(screen.getByText("users.detail.monthlyCost")).toBeInTheDocument();
      expect(screen.getByText("users.detail.renewingSoon")).toBeInTheDocument();
    });

    it("구독 요약이 없으면 빈 메시지를 표시한다", () => {
      render(<UserDetailClient id="user-1" />);

      expect(
        screen.getByText("users.detail.noSubscriptions")
      ).toBeInTheDocument();
    });

    it("USD 통화일 때 $ 기호를 표시한다", () => {
      mockUseShow.mockReturnValueOnce({
        query: {
          data: {
            data: {
              ...mockUserData,
              subscriptionSummary: {
                ...mockSubscriptionSummary,
                currency: "USD",
                monthlyAmount: 199,
              },
            },
          },
          isLoading: false,
        },
      });

      render(<UserDetailClient id="user-1" />);

      expect(screen.getByText(/\$199/)).toBeInTheDocument();
    });
  });
});
