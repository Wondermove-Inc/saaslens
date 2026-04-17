// src/components/users/terminated-users-list.test.tsx
import type { TerminatedUserWithAccess } from "@/types/user";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TerminatedUsersList } from "./terminated-users-list";

// Mock next-auth (server module 의존 차단)
vi.mock("next-auth", () => ({
  __esModule: true,
  default: () => ({}),
  auth: vi.fn(),
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string, params?: Record<string, unknown>) => {
      // billingType 키는 실제 번역값 반환
      const translations: Record<string, string> = {
        "users.terminated.billingType.PER_SEAT": "Per Seat",
        "users.terminated.billingType.FLAT_RATE": "정액제",
      };
      if (translations[key]) return translations[key];
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

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

// Mock actions
vi.mock("@/actions/users", () => ({
  revokeUserAppAccess: vi.fn(),
  revokeAllUserAppAccess: vi.fn(),
}));

// Mock users-write actions
vi.mock("@/actions/users-write", () => ({
  permanentlyDeleteUser: vi.fn(),
}));

const mockTerminatedUsers: TerminatedUserWithAccess[] = [
  {
    id: "user-1",
    email: "terminated1@example.com",
    name: "퇴사자1",
    avatarUrl: "https://example.com/avatar1.png",
    department: "개발팀",
    jobTitle: "개발자",
    terminatedAt: new Date("2024-01-15"),
    unrevokedAccessCount: 5,
    appAccesses: [
      {
        id: "access-1",
        appId: "app-1",
        appName: "Slack",
        appLogoUrl: "https://example.com/slack.png",
        accessLevel: "admin",
        grantedAt: new Date("2023-06-01"),
        lastUsedAt: new Date("2024-01-10"),
        source: "SSO_LOG",
      },
      {
        id: "access-2",
        appId: "app-2",
        appName: "Notion",
        appLogoUrl: null,
        accessLevel: "user",
        grantedAt: new Date("2023-07-01"),
        lastUsedAt: new Date("2024-01-05"),
        source: "SSO_LOG",
      },
      {
        id: "access-3",
        appId: "app-3",
        appName: "Jira",
        appLogoUrl: null,
        accessLevel: "user",
        grantedAt: new Date("2023-08-01"),
        lastUsedAt: null,
        source: "MANUAL",
      },
    ],
    subscriptionAssignments: [
      {
        id: "sa-1",
        subscriptionId: "sub-1",
        appId: "app-4",
        appName: "Figma",
        appLogoUrl: null,
        billingCycle: "MONTHLY",
        billingType: "PER_SEAT",
        assignedAt: new Date("2023-09-15"),
      },
      {
        id: "sa-2",
        subscriptionId: "sub-2",
        appId: "app-5",
        appName: "Adobe CC",
        appLogoUrl: null,
        billingCycle: "YEARLY",
        billingType: "FLAT_RATE",
        assignedAt: new Date("2023-10-01"),
      },
    ],
  },
  {
    id: "user-2",
    email: "terminated2@example.com",
    name: "퇴사자2",
    avatarUrl: null,
    department: "마케팅팀",
    jobTitle: "마케터",
    terminatedAt: new Date("2024-01-10"),
    unrevokedAccessCount: 1,
    appAccesses: [
      {
        id: "access-4",
        appId: "app-1",
        appName: "Slack",
        appLogoUrl: "https://example.com/slack.png",
        accessLevel: "user",
        grantedAt: new Date("2023-09-01"),
        lastUsedAt: new Date("2024-01-08"),
        source: "SSO_LOG",
      },
    ],
    subscriptionAssignments: [],
  },
];

describe("TerminatedUsersList", () => {
  it("퇴사자 목록이 비어있으면 안내 메시지를 표시해야 한다", () => {
    render(<TerminatedUsersList users={[]} />);

    expect(
      screen.getByText("미회수 접근 권한이 있는 퇴사자가 없습니다")
    ).toBeInTheDocument();
  });

  it("퇴사자 정보를 표시해야 한다", () => {
    render(<TerminatedUsersList users={mockTerminatedUsers} />);

    expect(screen.getByText("퇴사자1")).toBeInTheDocument();
    expect(screen.getByText("퇴사자2")).toBeInTheDocument();
    expect(screen.getByText("terminated1@example.com")).toBeInTheDocument();
  });

  it("부서 정보를 표시해야 한다", () => {
    render(<TerminatedUsersList users={mockTerminatedUsers} />);

    // 부서가 텍스트 내에 포함되어 있는지 확인
    expect(screen.getByText(/개발팀/)).toBeInTheDocument();
    expect(screen.getByText(/마케팅팀/)).toBeInTheDocument();
  });

  it("퇴사일을 포맷하여 표시해야 한다", () => {
    render(<TerminatedUsersList users={mockTerminatedUsers} />);

    // 퇴사일이 텍스트 내에 포함되어 있는지 확인
    expect(screen.getByText(/2024\.01\.15/)).toBeInTheDocument();
    // 2024.01.10은 퇴사일과 마지막 사용일 모두에 나타남
    const dateElements = screen.getAllByText(/2024\.01\.10/);
    expect(dateElements.length).toBeGreaterThanOrEqual(1);
  });

  it("미회수 앱 수를 표시해야 한다", () => {
    render(<TerminatedUsersList users={mockTerminatedUsers} />);

    expect(screen.getByText("5개 앱")).toBeInTheDocument();
    expect(screen.getByText("1개 앱")).toBeInTheDocument();
  });

  it("앱 접근 정보를 표시해야 한다", () => {
    render(<TerminatedUsersList users={mockTerminatedUsers} />);

    // Slack은 두 명 모두 접근권한이 있으므로 getAllByText 사용
    const slackElements = screen.getAllByText("Slack");
    expect(slackElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Notion")).toBeInTheDocument();
    expect(screen.getByText("Jira")).toBeInTheDocument();
  });

  it("접근 레벨을 표시해야 한다", () => {
    render(<TerminatedUsersList users={mockTerminatedUsers} />);

    expect(screen.getByText("admin")).toBeInTheDocument();
    // "user"는 여러 번 나타남
    const userLevels = screen.getAllByText("user");
    expect(userLevels.length).toBeGreaterThanOrEqual(1);
  });

  it("개별 회수 버튼이 존재해야 한다", () => {
    render(<TerminatedUsersList users={mockTerminatedUsers} />);

    // 총 4개의 앱 접근권한 (3 + 1)
    const revokeButtons = screen.getAllByRole("button", { name: /회수/i });
    expect(revokeButtons.length).toBeGreaterThanOrEqual(4);
  });

  it("전체 회수 버튼이 존재해야 한다", () => {
    render(<TerminatedUsersList users={mockTerminatedUsers} />);

    const allRevokeButtons = screen.getAllByRole("button", {
      name: /전체 회수/i,
    });
    expect(allRevokeButtons.length).toBe(2); // 퇴사자 2명
  });

  it("아바타가 있으면 이미지를 표시해야 한다", () => {
    render(<TerminatedUsersList users={mockTerminatedUsers} />);

    const avatarImg = screen.getByAltText("퇴사자1");
    expect(avatarImg).toHaveAttribute("src", "https://example.com/avatar1.png");
  });

  it("구독 할당의 billingType 뱃지를 표시해야 한다", () => {
    render(<TerminatedUsersList users={mockTerminatedUsers} />);

    expect(screen.getByText("Per Seat")).toBeInTheDocument();
    expect(screen.getByText("정액제")).toBeInTheDocument();
  });

  it("아바타가 없으면 이름 첫 글자를 표시해야 한다", () => {
    render(<TerminatedUsersList users={mockTerminatedUsers} />);

    // "퇴" (퇴사자2의 첫 글자)
    const avatarPlaceholder = screen.getAllByText("퇴");
    expect(avatarPlaceholder.length).toBeGreaterThanOrEqual(1);
  });
});
