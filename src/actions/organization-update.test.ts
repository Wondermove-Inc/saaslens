// src/actions/organization-update.test.ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { describe, expect, it, vi } from "vitest";
import { updateOrganization } from "./organization";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    organization: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// redirect mock
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    const error = new Error(`NEXT_REDIRECT:${url}`);
    error.name = "NEXT_REDIRECT";
    throw error;
  },
}));

describe("updateOrganization", () => {
  it("인증되지 않은 경우 /login으로 리다이렉트해야 한다", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);

    const formData = new FormData();
    formData.set("name", "조직");

    await expect(updateOrganization(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/login"
    );
  });

  it("조직이 없으면 /onboarding으로 리다이렉트해야 한다", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", organizationId: null, role: "ADMIN" },
    } as never);

    const formData = new FormData();
    formData.set("name", "조직");

    await expect(updateOrganization(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/onboarding"
    );
  });

  it("관리자가 아니면 실패 메시지를 반환해야 한다", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", organizationId: "org-1", role: "MEMBER" },
    } as never);

    const formData = new FormData();
    formData.set("name", "조직");

    const result = await updateOrganization(formData);
    expect(result.success).toBe(false);
    expect(result.message).toBe("관리자만 조직 정보를 수정할 수 있습니다");
  });

  it("조직명을 업데이트해야 한다", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
    } as never);

    vi.mocked(prisma.organization.findUnique).mockResolvedValueOnce({
      settings: {},
    } as never);

    // domain 중복 체크용 mock
    vi.mocked(prisma.organization.findFirst).mockResolvedValueOnce(null);

    const formData = new FormData();
    formData.set("name", "새 조직명");
    formData.set("domain", "example.com");
    formData.set("logoUrl", "https://example.com/logo.png");
    formData.set("address", "서울시 강남구");

    const result = await updateOrganization(formData);

    expect(result.success).toBe(true);
    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: {
        name: "새 조직명",
        domain: "example.com",
        logoUrl: "https://example.com/logo.png",
        settings: expect.objectContaining({ address: "서울시 강남구" }),
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/settings/organization");
  });
});
