// src/actions/pending-confirmations.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    vendorInferenceLog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    app: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
    nonSaaSVendor: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock email sender
vi.mock("@/lib/services/notification/email", () => ({
  sendConfirmationResultEmail: vi.fn().mockResolvedValue({ success: true }),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  confirmAsNonSaaS,
  confirmAsSaaS,
  getPendingConfirmations,
} from "./pending-confirmations";

describe("pending-confirmations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPendingConfirmations", () => {
    it("should return pending confirmation items with confidence 50-80%", async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          organizationId: "org-1",
          role: "ADMIN",
        },
      } as never);

      const mockLogs = [
        {
          id: "log-1",
          merchantName: "NOTION*TEAM",
          normalizedName: "notion",
          confidence: 0.65,
          isSaaS: true,
          suggestedName: "Notion",
          category: "Productivity",
          website: "https://notion.so",
          reasoning: "Team collaboration tool",
          createdAt: new Date("2025-01-01"),
          appId: "app-1",
          app: { id: "app-1", name: "Notion", status: "PENDING_REVIEW" },
        },
        {
          id: "log-2",
          merchantName: "FIGMA INC",
          normalizedName: "figma",
          confidence: 0.72,
          isSaaS: true,
          suggestedName: "Figma",
          category: "Design",
          website: "https://figma.com",
          reasoning: "Design tool",
          createdAt: new Date("2025-01-02"),
          appId: "app-2",
          app: { id: "app-2", name: "Figma", status: "PENDING_REVIEW" },
        },
      ];

      vi.mocked(prisma.vendorInferenceLog.findMany).mockResolvedValue(
        mockLogs as never
      );
      vi.mocked(prisma.vendorInferenceLog.count).mockResolvedValue(2);

      // Act
      const result = await getPendingConfirmations();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(2);
      expect(result.data?.total).toBe(2);

      const firstItem = result.data?.items[0];
      expect(firstItem?.merchantName).toBe("NOTION*TEAM");
      expect(firstItem?.confidence).toBe(0.65);
      expect(firstItem?.suggestedName).toBe("Notion");
    });

    it("should return error when not authenticated", async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue(null as never);

      // Act
      const result = await getPendingConfirmations();

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe("인증이 필요합니다");
    });

    it("should filter by confidence range 0.5 to 0.8", async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          organizationId: "org-1",
          role: "ADMIN",
        },
      } as never);

      vi.mocked(prisma.vendorInferenceLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.vendorInferenceLog.count).mockResolvedValue(0);

      // Act
      await getPendingConfirmations();

      // Assert
      expect(prisma.vendorInferenceLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org-1",
            confidence: { gte: 0.5, lte: 0.8 },
            isSaaS: true,
            app: { status: "PENDING_REVIEW" },
          }),
        })
      );
    });
  });

  describe("confirmAsSaaS", () => {
    it("should approve app and update status to ACTIVE", async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          organizationId: "org-1",
          role: "ADMIN",
        },
      } as never);

      vi.mocked(prisma.app.findFirst).mockResolvedValue({
        id: "app-1",
        name: "Notion",
        organizationId: "org-1",
        status: "PENDING_REVIEW",
      } as never);

      vi.mocked(prisma.app.update).mockResolvedValue({
        id: "app-1",
        name: "Notion",
        status: "ACTIVE",
      } as never);

      // Act
      const result = await confirmAsSaaS("app-1");

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain("승인");
      expect(prisma.app.update).toHaveBeenCalledWith({
        where: { id: "app-1" },
        data: { status: "ACTIVE" },
      });
    });

    it("should return error when user is not ADMIN", async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          organizationId: "org-1",
          role: "MEMBER",
        },
      } as never);

      // Act
      const result = await confirmAsSaaS("app-1");

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe("관리자만 확인할 수 있습니다");
    });
  });

  describe("confirmAsNonSaaS", () => {
    it("should reject app and cache as non-SaaS vendor", async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          organizationId: "org-1",
          role: "ADMIN",
        },
      } as never);

      vi.mocked(prisma.app.findFirst).mockResolvedValue({
        id: "app-1",
        name: "Unknown Vendor",
        organizationId: "org-1",
        status: "PENDING_REVIEW",
      } as never);

      // Mock $transaction to execute the callback with a mock tx object
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        const mockTx = {
          app: {
            update: vi.fn().mockResolvedValue({
              id: "app-1",
              name: "Unknown Vendor",
              status: "BLOCKED",
            }),
          },
          nonSaaSVendor: {
            upsert: vi.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx as never);
      });

      // Act
      const result = await confirmAsNonSaaS("app-1", "unknown-vendor");

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain("비-SaaS");
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
