import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import IntegrationsPage from "./page";

const mockRedirect = vi.fn();
const mockRequireOrganization = vi.fn();

vi.mock("@/components/integrations/integrations-page-client", () => ({
  IntegrationsPageClient: ({
    canManage,
    role,
  }: {
    canManage: boolean;
    role: string;
  }) => (
    <div
      data-testid="integrations-client"
      data-can-manage={String(canManage)}
      data-role={role}
    >
      Integrations Client
    </div>
  ),
}));

vi.mock("@/lib/auth/require-auth", () => ({
  requireOrganization: () => mockRequireOrganization(),
}));

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

describe("IntegrationsPage (server)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("관리자 권한을 가진 사용자는 canManage=true로 클라이언트를 렌더링한다", async () => {
    const page = await IntegrationsPage();
    render(page);

    const client = screen.getByTestId("integrations-client");
    expect(client).toHaveAttribute("data-can-manage", "true");
    expect(client).toHaveAttribute("data-role", "ADMIN");
  });

  it("멤버 권한 사용자는 canManage=false로 렌더링된다", async () => {
    mockRequireOrganization.mockResolvedValueOnce({
      session: {
        user: {
          id: "user-2",
          email: "member@example.com",
          name: "멤버",
          organizationId: "org-1",
          role: "MEMBER",
        },
      },
      organizationId: "org-1",
      userId: "user-2",
      role: "MEMBER",
    });

    const page = await IntegrationsPage();
    render(page);

    const client = screen.getByTestId("integrations-client");
    expect(client).toHaveAttribute("data-can-manage", "false");
    expect(client).toHaveAttribute("data-role", "MEMBER");
  });

  it("세션이 없으면 requireOrganization이 리다이렉트를 처리한다", async () => {
    // requireOrganization은 내부에서 redirect를 호출하므로
    // 세션이 없는 경우를 시뮬레이션하려면 throw해야 함
    mockRequireOrganization.mockImplementationOnce(() => {
      mockRedirect("/login");
      throw new Error("NEXT_REDIRECT");
    });

    await expect(IntegrationsPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });
});
