// src/app/(dashboard)/settings/profile/page.test.tsx
import { prisma } from "@/lib/db";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfilePage from "./page";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: {
      id: "user-1",
      email: "test@example.com",
      name: "테스트 유저",
      organizationId: "org-1",
      role: "MEMBER",
    },
  }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("프로필 폼 필드를 표시해야 한다", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      name: "테스트 유저",
      department: "플랫폼",
      // jobTitle, avatarUrl은 주석 처리되어 사용하지 않음
    } as never);

    const page = await ProfilePage();
    render(page);

    expect(screen.getByText("이름 *")).toBeInTheDocument();
    expect(screen.getByDisplayValue("테스트 유저")).toBeInTheDocument();
  });

  it("아바타가 표시되지 않아야 한다 (주석 처리됨)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      name: "테스트 유저",
      department: "플랫폼",
    } as never);

    const page = await ProfilePage();
    render(page);

    expect(screen.queryByText("아바타")).not.toBeInTheDocument();
    expect(screen.queryByText("새로 생성")).not.toBeInTheDocument();
  });

  it("직함 필드가 표시되지 않아야 한다 (주석 처리됨)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      name: "테스트 유저",
      department: "플랫폼",
    } as never);

    const page = await ProfilePage();
    render(page);

    expect(screen.queryByText("직함")).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/프로덕트 엔지니어/)
    ).not.toBeInTheDocument();
  });

  it("부서가 텍스트로 표시되어야 한다", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      name: "테스트 유저",
      department: "플랫폼",
    } as never);

    const page = await ProfilePage();
    render(page);

    expect(screen.getByText("부서")).toBeInTheDocument();
    expect(screen.getByText("플랫폼")).toBeInTheDocument();
    // 부서가 입력 필드가 아닌 텍스트로 표시되는지 확인
    expect(screen.queryByPlaceholderText(/플랫폼팀/)).not.toBeInTheDocument();
  });

  it("이메일이 텍스트로 표시되어야 한다", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      name: "테스트 유저",
      department: "플랫폼",
    } as never);

    const page = await ProfilePage();
    render(page);

    expect(screen.getByText("이메일")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });
});
