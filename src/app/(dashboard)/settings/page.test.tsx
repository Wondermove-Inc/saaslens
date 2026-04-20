// src/app/(dashboard)/settings/page.test.tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "./page";

const mockUseGetIdentity = vi.fn();
const mockRequireOrganization = vi.fn();

vi.mock("@refinedev/core", () => ({
  useGetIdentity: (...args: unknown[]) => mockUseGetIdentity(...args),
}));

// Mock require-auth
vi.mock("@/lib/auth/require-auth", () => ({
  requireOrganization: () => mockRequireOrganization(),
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGetIdentity.mockReturnValue({
      data: {
        id: "user-1",
        email: "test@example.com",
        name: "테스트 관리자",
        organizationId: "org-1",
        role: "ADMIN",
      },
      isLoading: false,
    });
    mockRequireOrganization.mockResolvedValue({
      session: {
        user: {
          id: "user-1",
          email: "test@example.com",
          name: "테스트 관리자",
          organizationId: "org-1",
          role: "ADMIN",
        },
      },
      organizationId: "org-1",
      userId: "user-1",
      role: "ADMIN",
    });
  });

  it("설정 개요 카드를 표시해야 한다", async () => {
    const page = await SettingsPage();
    render(page);

    expect(screen.getByText("설정 개요")).toBeInTheDocument();
    expect(
      screen.getByText("좌측 메뉴에서 원하는 설정 항목을 선택하세요")
    ).toBeInTheDocument();
  });

  it("사용자 이름을 표시해야 한다", async () => {
    const page = await SettingsPage();
    render(page);

    expect(screen.getByText("테스트 관리자")).toBeInTheDocument();
  });

  it("사용자 이메일을 표시해야 한다", async () => {
    const page = await SettingsPage();
    render(page);

    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("사용자 역할을 표시해야 한다", async () => {
    const page = await SettingsPage();
    render(page);

    expect(screen.getByText("관리자")).toBeInTheDocument();
  });

  it("조직 ID 일부를 표시해야 한다", async () => {
    const page = await SettingsPage();
    render(page);

    // org-1의 첫 8자 + "..."
    expect(screen.getByText(/org-1.../)).toBeInTheDocument();
  });

  it("비관리자도 기본 설정 정보를 볼 수 있다", async () => {
    mockRequireOrganization.mockResolvedValueOnce({
      session: {
        user: {
          id: "user-2",
          email: "member@example.com",
          name: "테스트 멤버",
          organizationId: "org-1",
          role: "MEMBER",
        },
      },
      organizationId: "org-1",
      userId: "user-2",
      role: "MEMBER",
    });
    mockUseGetIdentity.mockReturnValueOnce({
      data: {
        id: "user-2",
        email: "member@example.com",
        name: "테스트 멤버",
        organizationId: "org-1",
        role: "MEMBER",
      },
      isLoading: false,
    });

    const page = await SettingsPage();
    render(page);

    // 멤버도 기본 설정 정보를 볼 수 있어야 함
    expect(screen.getByText("테스트 멤버")).toBeInTheDocument();
    expect(screen.getByText("member@example.com")).toBeInTheDocument();
    expect(screen.getByText("멤버")).toBeInTheDocument();
  });
});
