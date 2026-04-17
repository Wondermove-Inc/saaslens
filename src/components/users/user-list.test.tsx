// src/components/users/user-list.test.tsx
import type { UserListItem } from "@/types/user";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UserList } from "./user-list";

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

const mockUsers: UserListItem[] = [
  {
    id: "user-1",
    email: "admin@example.com",
    name: "관리자",
    avatarUrl: "https://example.com/avatar1.png",
    role: "ADMIN",
    status: "ACTIVE",
    department: "경영팀",
    team: { id: "team-1", name: "경영팀" },
    jobTitle: "CTO",
    lastLoginAt: new Date("2024-01-15"),
    terminatedAt: null,
    assignedAppCount: 10,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "user-2",
    email: "member@example.com",
    name: "팀원",
    avatarUrl: null,
    role: "MEMBER",
    status: "ACTIVE",
    department: "개발팀",
    team: { id: "team-2", name: "개발팀" },
    jobTitle: "개발자",
    lastLoginAt: new Date("2024-01-10"),
    terminatedAt: null,
    assignedAppCount: 5,
    createdAt: new Date("2024-01-02"),
    updatedAt: new Date("2024-01-10"),
  },
  {
    id: "user-3",
    email: "terminated@example.com",
    name: "퇴사자",
    avatarUrl: null,
    role: "MEMBER",
    status: "TERMINATED",
    department: "개발팀",
    team: null,
    jobTitle: "개발자",
    lastLoginAt: new Date("2023-12-01"),
    terminatedAt: new Date("2024-01-05"),
    assignedAppCount: 3,
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2024-01-05"),
  },
];

describe("UserList", () => {
  it("사용자 목록이 비어있으면 안내 메시지를 표시해야 한다", () => {
    render(<UserList users={[]} />);

    expect(screen.getByText("등록된 사용자가 없습니다")).toBeInTheDocument();
  });

  it("사용자 목록이 있으면 테이블을 표시해야 한다", () => {
    render(<UserList users={mockUsers} />);

    // 관리자는 이름과 역할 배지 모두에 나타남
    const adminElements = screen.getAllByText("관리자");
    expect(adminElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("팀원")).toBeInTheDocument();
    expect(screen.getByText("퇴사자")).toBeInTheDocument();
  });

  it("이메일을 사용자 상세 페이지 링크로 표시해야 한다", () => {
    render(<UserList users={mockUsers} />);

    const adminLink = screen.getByText("admin@example.com").closest("a");
    expect(adminLink).toHaveAttribute("href", "/users/user-1");
  });

  it("사용자 상태에 따라 올바른 배지를 표시해야 한다", () => {
    render(<UserList users={mockUsers} />);

    // 활성 사용자 2명
    const activeElements = screen.getAllByText("활성");
    expect(activeElements.length).toBe(2);

    // 퇴사자 1명
    expect(screen.getByText("퇴사")).toBeInTheDocument();
  });

  it("사용자 역할을 올바르게 표시해야 한다", () => {
    render(<UserList users={mockUsers} />);

    // "관리자"는 이름과 역할 배지 모두에 나타남
    const adminElements = screen.getAllByText("관리자");
    expect(adminElements.length).toBeGreaterThanOrEqual(1);
    // "멤버"는 역할 배지에 표시됨
    const memberBadges = screen.getAllByText("멤버");
    expect(memberBadges.length).toBe(2);
  });

  it("부서 정보를 표시해야 한다", () => {
    render(<UserList users={mockUsers} />);

    expect(screen.getByText("경영팀")).toBeInTheDocument();
    // "개발팀"은 2명이 있음
    const devDept = screen.getAllByText("개발팀");
    expect(devDept.length).toBe(2);
  });

  it("앱 접근 수를 표시해야 한다", () => {
    render(<UserList users={mockUsers} />);

    // 여러 곳에서 같은 숫자가 표시될 수 있음
    expect(screen.getAllByText("10").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("5").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);
  });

  it("마지막 로그인 날짜를 포맷하여 표시해야 한다", () => {
    render(<UserList users={mockUsers} />);

    expect(screen.getByText("2024.01.15")).toBeInTheDocument();
    expect(screen.getByText("2024.01.10")).toBeInTheDocument();
  });

  it("아바타 URL이 있으면 이미지를 표시해야 한다", () => {
    render(<UserList users={mockUsers} />);

    const avatarImg = screen.getByAltText("관리자");
    expect(avatarImg).toHaveAttribute("src", "https://example.com/avatar1.png");
  });

  it("아바타 URL이 없으면 이름 첫 글자를 표시해야 한다", () => {
    render(<UserList users={mockUsers} />);

    // "팀" (팀원의 첫 글자)
    expect(screen.getByText("팀")).toBeInTheDocument();
  });

  it("이름을 클릭하면 사용자 상세 페이지로 이동해야 한다", () => {
    render(<UserList users={mockUsers} />);

    // "관리자"는 여러 곳에 나타나므로 첫 번째 요소 사용
    const adminElements = screen.getAllByText("관리자");
    const nameLink = adminElements[0].closest("a");
    expect(nameLink).toHaveAttribute("href", "/users/user-1");
  });
});
