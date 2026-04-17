// src/actions/users-utils.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { count: vi.fn() },
    app: { count: vi.fn() },
    corporateCard: { count: vi.fn() },
    cardTransaction: { count: vi.fn() },
    subscriptionUser: { count: vi.fn() },
  },
}));

import { prisma } from "@/lib/db";
import { getUserRelatedDataCounts, isLastAdmin } from "./users-utils";

const mockPrisma = prisma as unknown as {
  user: { count: ReturnType<typeof vi.fn> };
  app: { count: ReturnType<typeof vi.fn> };
  corporateCard: { count: ReturnType<typeof vi.fn> };
  cardTransaction: { count: ReturnType<typeof vi.fn> };
  subscriptionUser: { count: ReturnType<typeof vi.fn> };
};

describe("users-utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isLastAdmin", () => {
    it("should return true when no other admins exist", async () => {
      mockPrisma.user.count.mockResolvedValue(0);

      const result = await isLastAdmin("org-1", "user-1");

      expect(result).toBe(true);
      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: {
          organizationId: "org-1",
          role: "ADMIN",
          id: { not: "user-1" },
        },
      });
    });

    it("should return false when other admins exist", async () => {
      mockPrisma.user.count.mockResolvedValue(2);

      const result = await isLastAdmin("org-1", "user-1");

      expect(result).toBe(false);
    });
  });

  describe("getUserRelatedDataCounts", () => {
    it("should return counts for all related data", async () => {
      mockPrisma.app.count.mockResolvedValue(3);
      mockPrisma.corporateCard.count.mockResolvedValue(1);
      mockPrisma.cardTransaction.count.mockResolvedValue(10);
      mockPrisma.user.count.mockResolvedValue(2);
      mockPrisma.subscriptionUser.count.mockResolvedValue(5);

      const result = await getUserRelatedDataCounts("user-1");

      expect(result).toEqual({
        ownedApps: 3,
        assignedCorporateCards: 1,
        assignedCardTransactions: 10,
        directReports: 2,
        assignedSubscriptions: 5,
      });
      expect(mockPrisma.app.count).toHaveBeenCalledWith({
        where: { ownerId: "user-1" },
      });
      expect(mockPrisma.corporateCard.count).toHaveBeenCalledWith({
        where: { assignedUserId: "user-1" },
      });
      expect(mockPrisma.cardTransaction.count).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });
      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: { managerId: "user-1" },
      });
      expect(mockPrisma.subscriptionUser.count).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });
    });

    it("should return zeros when no related data exists", async () => {
      mockPrisma.app.count.mockResolvedValue(0);
      mockPrisma.corporateCard.count.mockResolvedValue(0);
      mockPrisma.cardTransaction.count.mockResolvedValue(0);
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.subscriptionUser.count.mockResolvedValue(0);

      const result = await getUserRelatedDataCounts("user-2");

      expect(result).toEqual({
        ownedApps: 0,
        assignedCorporateCards: 0,
        assignedCardTransactions: 0,
        directReports: 0,
        assignedSubscriptions: 0,
      });
    });
  });
});
