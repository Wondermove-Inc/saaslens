// src/actions/saas-patterns.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock modules
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    merchantPattern: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    saaSPattern: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    saaSCatalog: {
      findFirst: vi.fn(),
    },
    app: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock next/navigation redirect - Next.js redirect error has a digest property
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    const error = new Error(`NEXT_REDIRECT:${url}`);
    (error as Error & { digest: string }).digest = `NEXT_REDIRECT:${url}`;
    throw error;
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createMerchantPattern,
  deleteMerchantPattern,
  getMerchantPatterns,
  updateMerchantPattern,
} from "./saas-patterns";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockedAuth = auth as any;

describe("SaaS Pattern Server Actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockRedirect.mockClear();
  });

  describe("getMerchantPatterns", () => {
    it("인증되지 않은 경우 /login으로 리다이렉트해야 한다", async () => {
      mockedAuth.mockResolvedValue(null);

      await expect(getMerchantPatterns()).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirect).toHaveBeenCalledWith("/login");
    });

    it("가맹점 패턴 목록을 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1" },
        expires: "",
      });

      const mockPatterns = [
        {
          id: "pattern-1",
          organizationId: "org-1",
          pattern: "SLACK*",
          matchType: "PREFIX",
          appId: "app-1",
          app: { name: "Slack" },
          priority: 10,
          isActive: true,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
      ];

      vi.mocked(prisma.merchantPattern.findMany).mockResolvedValue(
        mockPatterns as never
      );

      const result = await getMerchantPatterns();

      expect(result).toHaveLength(1);
      expect(result[0].pattern).toBe("SLACK*");
      expect(result[0].app.name).toBe("Slack");
    });
  });

  describe("createMerchantPattern", () => {
    it("관리자가 아니면 에러를 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "MEMBER" },
        expires: "",
      });

      const result = await createMerchantPattern({
        pattern: "SLACK*",
        matchType: "CONTAINS",
        appId: "app-1",
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("관리자 권한이 필요합니다");
    });

    it("존재하지 않는 앱이면 에러를 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
        expires: "",
      });

      vi.mocked(prisma.app.findFirst).mockResolvedValue(null);

      const result = await createMerchantPattern({
        pattern: "SLACK*",
        matchType: "CONTAINS",
        appId: "non-existent",
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("앱을 찾을 수 없습니다");
    });

    it("가맹점 패턴을 성공적으로 생성해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
        expires: "",
      });

      vi.mocked(prisma.app.findFirst).mockResolvedValue({
        id: "app-1",
        name: "Slack",
        organizationId: "org-1",
      } as never);

      vi.mocked(prisma.merchantPattern.create).mockResolvedValue({
        id: "pattern-1",
        organizationId: "org-1",
        pattern: "SLACK*",
        matchType: "CONTAINS",
        appId: "app-1",
      } as never);

      const result = await createMerchantPattern({
        pattern: "SLACK*",
        matchType: "CONTAINS",
        appId: "app-1",
      });

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("pattern-1");
    });
  });

  describe("updateMerchantPattern", () => {
    it("가맹점 패턴을 수정해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
        expires: "",
      });

      vi.mocked(prisma.merchantPattern.findFirst).mockResolvedValue({
        id: "pattern-1",
        organizationId: "org-1",
      } as never);

      vi.mocked(prisma.merchantPattern.update).mockResolvedValue({
        id: "pattern-1",
        priority: 20,
      } as never);

      const result = await updateMerchantPattern("pattern-1", {
        priority: 20,
      });

      expect(result.success).toBe(true);
      expect(prisma.merchantPattern.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "pattern-1" },
          data: expect.objectContaining({ priority: 20 }),
        })
      );
    });

    it("존재하지 않는 패턴은 에러를 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
        expires: "",
      });

      vi.mocked(prisma.merchantPattern.findFirst).mockResolvedValue(null);

      const result = await updateMerchantPattern("non-existent", {
        priority: 20,
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("패턴을 찾을 수 없습니다");
    });
  });

  describe("deleteMerchantPattern", () => {
    it("관리자가 아니면 에러를 반환해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "MEMBER" },
        expires: "",
      });

      const result = await deleteMerchantPattern("pattern-1");

      expect(result.success).toBe(false);
      expect(result.message).toBe("관리자 권한이 필요합니다");
    });

    it("가맹점 패턴을 삭제해야 한다", async () => {
      mockedAuth.mockResolvedValue({
        user: { id: "user-1", organizationId: "org-1", role: "ADMIN" },
        expires: "",
      });

      vi.mocked(prisma.merchantPattern.findFirst).mockResolvedValue({
        id: "pattern-1",
        organizationId: "org-1",
      } as never);

      vi.mocked(prisma.merchantPattern.delete).mockResolvedValue({} as never);

      const result = await deleteMerchantPattern("pattern-1");

      expect(result.success).toBe(true);
      expect(prisma.merchantPattern.delete).toHaveBeenCalledWith({
        where: { id: "pattern-1" },
      });
    });
  });
});
