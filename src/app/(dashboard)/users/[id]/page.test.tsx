// src/app/(dashboard)/users/[id]/page.test.tsx
import { getUserCached } from "@/actions/users";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UserDetailPage from "./page";

// Mock actions
vi.mock("@/actions/users", () => ({
  getUserCached: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock("@/components/users/user-detail-client", () => ({
  UserDetailClient: ({ id }: { id: string }) => (
    <div data-testid="user-detail-client">client-{id}</div>
  ),
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

import type { UserDetail } from "@/types/user";

const mockUser: UserDetail = {
  id: "user-1",
  email: "test@example.com",
  name: "테스트 사용자",
  avatarUrl: null,
  role: "MEMBER",
  status: "ACTIVE",
  department: null,
  team: null,
  jobTitle: null,
  lastLoginAt: null,
  terminatedAt: null,
  assignedAppCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  employeeId: null,
  appAccesses: [],
};

describe("UserDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("사용자가 있으면 UserDetailClient를 렌더링한다", async () => {
    vi.mocked(getUserCached).mockResolvedValue(mockUser);

    const page = await UserDetailPage({
      params: Promise.resolve({ id: "user-1" }),
    });
    render(page);

    expect(screen.getByTestId("user-detail-client")).toHaveTextContent(
      "client-user-1"
    );
  });

  it("사용자를 찾을 수 없으면 notFound를 호출해야 한다", async () => {
    vi.mocked(getUserCached).mockResolvedValue(null);
    const { notFound } = await import("next/navigation");

    try {
      await UserDetailPage({ params: Promise.resolve({ id: "non-existent" }) });
    } catch {
      // notFound() throws, which is expected
    }

    expect(notFound).toHaveBeenCalled();
  });
});
