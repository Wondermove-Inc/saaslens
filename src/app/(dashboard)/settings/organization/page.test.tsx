// src/app/(dashboard)/settings/organization/page.test.tsx
import { prisma } from "@/lib/db";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OrganizationSettingsPage from "./page";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: {
      id: "user-1",
      email: "admin@example.com",
      organizationId: "org-1",
      role: "ADMIN",
    },
  }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    organization: {
      findUnique: vi.fn(),
    },
  },
}));

describe("OrganizationSettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("조직 정보 탭과 조직명을 표시해야 한다", async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      name: "테스트 조직",
      domain: "example.com",
      logoUrl: "https://example.com/logo.png",
      settings: { address: "서울시 강남구" },
    } as never);

    const page = await OrganizationSettingsPage();
    render(page);

    expect(screen.getByText("조직 정보")).toBeInTheDocument();
    expect(screen.getByDisplayValue("테스트 조직")).toBeInTheDocument();
    expect(screen.getByDisplayValue("example.com")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("https://example.com/logo.png")
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("서울시 강남구")).toBeInTheDocument();
  });
});
