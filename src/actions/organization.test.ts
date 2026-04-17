// src/actions/organization.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock modules
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// redirect mock - Next.js redirect throws NEXT_REDIRECT error
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    const error = new Error(`NEXT_REDIRECT:${url}`);
    error.name = "NEXT_REDIRECT";
    throw error;
  }),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createOrganization } from "./organization";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockedAuth = auth as any;

describe("createOrganization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("인증 검증", () => {
    it("인증되지 않은 사용자는 로그인 페이지로 리다이렉트해야 한다", async () => {
      mockedAuth.mockResolvedValue(null);

      const formData = new FormData();
      formData.set("name", "테스트 조직");

      await expect(createOrganization(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/login"
      );
    });

    it("세션에 user.id가 없으면 로그인 페이지로 리다이렉트해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "", email: "test@test.com" },
        expires: "",
      });

      const formData = new FormData();
      formData.set("name", "테스트 조직");

      await expect(createOrganization(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/login"
      );
    });
  });

  describe("유효성 검사", () => {
    it("조직명이 없으면 에러가 발생해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
        expires: "",
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        organizationId: null,
      } as never);

      const formData = new FormData();
      formData.set("name", "");

      await expect(createOrganization(formData)).rejects.toThrow();
    });

    it("조직명이 2자 미만이면 에러가 발생해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
        expires: "",
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        organizationId: null,
      } as never);

      const formData = new FormData();
      formData.set("name", "A");

      await expect(createOrganization(formData)).rejects.toThrow();
    });
  });

  describe("중복 조직 방지", () => {
    it("이미 조직에 소속된 사용자는 에러가 발생해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
        expires: "",
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        organizationId: "existing-org-id",
      } as never);

      const formData = new FormData();
      formData.set("name", "테스트 조직");

      await expect(createOrganization(formData)).rejects.toThrow(
        "이미 조직에 소속되어 있습니다"
      );
    });
  });

  describe("성공 케이스", () => {
    it("조직 생성 후 대시보드로 리다이렉트해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
        expires: "",
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        organizationId: null,
      } as never);

      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        const tx = {
          organization: {
            create: vi.fn().mockResolvedValue({ id: "new-org-id" }),
          },
          user: {
            update: vi.fn().mockResolvedValue({}),
          },
        };
        return fn(tx as never);
      });

      const formData = new FormData();
      formData.set("name", "테스트 조직");

      // redirect throws NEXT_REDIRECT error
      await expect(createOrganization(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/dashboard"
      );
    });

    it("트랜잭션에서 조직을 생성하고 사용자를 ADMIN으로 업데이트해야 한다", async () => {
      const mockCreate = vi.fn().mockResolvedValue({ id: "new-org-id" });
      const mockUpdate = vi.fn().mockResolvedValue({});

      mockedAuth.mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
        expires: "",
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        organizationId: null,
      } as never);

      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        const tx = {
          organization: { create: mockCreate },
          user: { update: mockUpdate },
        };
        return fn(tx as never);
      });

      const formData = new FormData();
      formData.set("name", "테스트 조직");

      // redirect throws, so we catch and verify the mocks were called
      try {
        await createOrganization(formData);
      } catch (error) {
        // redirect throws NEXT_REDIRECT
        expect((error as Error).message).toContain("NEXT_REDIRECT:/dashboard");
      }

      expect(mockCreate).toHaveBeenCalledWith({
        data: { name: "테스트 조직" },
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: {
          organizationId: "new-org-id",
          role: "ADMIN",
        },
      });
    });
  });
});
