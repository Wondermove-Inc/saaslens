// src/app/(dashboard)/settings/team/page.test.tsx
import { getInvitations } from "@/actions/invitations";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeamPage from "./page";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/actions/invitations", () => ({
  createInvitation: vi.fn(),
  getInvitations: vi.fn(),
  cancelInvitation: vi.fn(),
  resendInvitation: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT: ${url}`);
  }),
}));

describe("TeamPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("관리자가 아닐 때 안내를 표시해야 한다", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1", role: "MEMBER" },
    } as never);

    const page = await TeamPage();
    render(page);

    expect(
      screen.getByText(/관리자만 팀원을 초대할 수 있습니다/)
    ).toBeInTheDocument();
  });

  it("관리자일 때 초대 폼과 목록을 표시해야 한다", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
    } as never);

    vi.mocked(getInvitations).mockResolvedValue({
      success: true,
      data: [
        {
          id: "inv-1",
          email: "test@example.com",
          role: "MEMBER",
          status: "PENDING",
          token: "t",
          organizationId: "org-1",
          invitedById: "user-1",
          expiresAt: new Date("2024-01-01"),
          createdAt: new Date(),
          updatedAt: new Date(),
          invitedBy: { name: "Admin" },
        },
      ],
    } as never);

    const page = await TeamPage();
    render(page);

    // PageHeader와 Card 제목에 "멤버 초대"가 중복되므로 getAllByText 사용
    expect(screen.getAllByText("멤버 초대").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText("이메일")).toBeInTheDocument();
    expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /재발송/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /초대 취소/i })
    ).toBeInTheDocument();
  });
});
